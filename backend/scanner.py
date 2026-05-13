"""
Schema scanner — connects to PostgreSQL or SQL Server and returns
full schema metadata: tables, columns, indexes, foreign keys, views.
"""
from __future__ import annotations
import re


# ---------------------------------------------------------------------------
# PostgreSQL
# ---------------------------------------------------------------------------

def scan_postgres(host: str, port: int, dbname: str, user: str, password: str) -> dict:
    import psycopg2
    import psycopg2.extras

    conn = psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password, connect_timeout=10)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Tables + row counts
    cur.execute("""
        SELECT
            t.table_schema   AS schema,
            t.table_name     AS name,
            obj_description(pc.oid, 'pg_class') AS description,
            pc.reltuples::bigint AS row_estimate
        FROM information_schema.tables t
        JOIN pg_class pc ON pc.relname = t.table_name
        JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = t.table_schema
        WHERE t.table_type = 'BASE TABLE'
          AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY t.table_schema, t.table_name
    """)
    tables_raw = cur.fetchall()

    # Columns — use pg_attribute.attnum for col_description (correct even after DROP COLUMN)
    cur.execute("""
        SELECT
            n.nspname                   AS table_schema,
            cls.relname                 AS table_name,
            a.attname                   AS column_name,
            a.attnum                    AS ordinal_position,
            pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
            NULL::int                   AS character_maximum_length,
            NULL::int                   AS numeric_precision,
            NULL::int                   AS numeric_scale,
            CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
            pg_get_expr(d.adbin, d.adrelid) AS column_default,
            EXISTS (
                SELECT 1 FROM pg_index ix
                WHERE ix.indrelid = a.attrelid
                  AND ix.indisprimary
                  AND a.attnum = ANY(ix.indkey)
            ) AS is_primary_key,
            col_description(cls.oid, a.attnum) AS description
        FROM pg_attribute a
        JOIN pg_class cls     ON cls.oid = a.attrelid
        JOIN pg_namespace n   ON n.oid = cls.relnamespace
        JOIN pg_type t        ON t.oid = a.atttypid
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE cls.relkind = 'r'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY n.nspname, cls.relname, a.attnum
    """)
    columns_raw = cur.fetchall()

    # Indexes
    cur.execute("""
        SELECT
            pn.nspname      AS schema,
            pc.relname      AS table_name,
            pi.relname      AS index_name,
            ix.indisunique  AS is_unique,
            ix.indisprimary AS is_primary,
            array_to_string(array_agg(pa.attname ORDER BY k.ordinality), ', ') AS columns
        FROM pg_index ix
        JOIN pg_class pc  ON pc.oid = ix.indrelid
        JOIN pg_class pi  ON pi.oid = ix.indexrelid
        JOIN pg_namespace pn ON pn.oid = pc.relnamespace
        JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ordinality) ON true
        JOIN pg_attribute pa ON pa.attrelid = pc.oid AND pa.attnum = k.attnum
        WHERE pn.nspname NOT IN ('pg_catalog', 'information_schema')
          AND pc.relkind = 'r'
        GROUP BY pn.nspname, pc.relname, pi.relname, ix.indisunique, ix.indisprimary
        ORDER BY pn.nspname, pc.relname, pi.relname
    """)
    indexes_raw = cur.fetchall()

    # Foreign keys
    cur.execute("""
        SELECT
            tc.table_schema     AS schema,
            tc.table_name,
            kcu.column_name,
            ccu.table_schema    AS ref_schema,
            ccu.table_name      AS ref_table,
            ccu.column_name     AS ref_column,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY tc.table_schema, tc.table_name
    """)
    fks_raw = cur.fetchall()

    # Views
    cur.execute("""
        SELECT table_schema AS schema, table_name AS name, view_definition AS definition
        FROM information_schema.views
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name
    """)
    views_raw = cur.fetchall()

    cur.close()
    conn.close()

    return _build_result(tables_raw, columns_raw, indexes_raw, fks_raw, views_raw, dbname)


# ---------------------------------------------------------------------------
# SQL Server
# ---------------------------------------------------------------------------

def scan_sqlserver(host: str, port: int, dbname: str, user: str, password: str) -> dict:
    import pyodbc
    drivers = [d for d in pyodbc.drivers() if "SQL Server" in d]
    if not drivers:
        raise RuntimeError("No SQL Server ODBC driver found. Install 'ODBC Driver 17 for SQL Server'.")
    driver = drivers[-1]

    conn_str = (
        f"DRIVER={{{driver}}};"
        f"SERVER={host},{port};"
        f"DATABASE={dbname};"
        f"UID={user};"
        f"PWD={password};"
        f"Connection Timeout=10;"
    )
    conn = pyodbc.connect(conn_str)
    cur  = conn.cursor()

    def fetchall_dict(cursor):
        cols = [d[0] for d in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]

    # Tables
    cur.execute("""
        SELECT
            s.name              AS [schema],
            t.name              AS name,
            ep.value            AS description,
            p.rows              AS row_estimate
        FROM sys.tables t
        JOIN sys.schemas s ON s.schema_id = t.schema_id
        LEFT JOIN sys.extended_properties ep
          ON ep.major_id = t.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
        LEFT JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0,1)
        ORDER BY s.name, t.name
    """)
    tables_raw = fetchall_dict(cur)

    # Columns
    cur.execute("""
        SELECT
            s.name              AS table_schema,
            t.name              AS table_name,
            c.name              AS column_name,
            c.column_id         AS ordinal_position,
            tp.name             AS data_type,
            c.max_length        AS character_maximum_length,
            c.precision         AS numeric_precision,
            c.scale             AS numeric_scale,
            CASE c.is_nullable WHEN 1 THEN 'YES' ELSE 'NO' END AS is_nullable,
            dc.definition       AS column_default,
            CASE WHEN ic.column_id IS NOT NULL THEN 1 ELSE 0 END AS is_primary_key,
            CAST(ep.value AS NVARCHAR(MAX)) AS description
        FROM sys.columns c
        JOIN sys.tables t  ON t.object_id = c.object_id
        JOIN sys.schemas s ON s.schema_id = t.schema_id
        JOIN sys.types tp  ON tp.user_type_id = c.user_type_id
        LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
        LEFT JOIN (
            SELECT ic2.object_id, ic2.column_id
            FROM sys.index_columns ic2
            JOIN sys.indexes i2 ON i2.object_id = ic2.object_id AND i2.index_id = ic2.index_id
            WHERE i2.is_primary_key = 1
        ) ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        LEFT JOIN sys.extended_properties ep
          ON ep.major_id = c.object_id AND ep.minor_id = c.column_id AND ep.name = 'MS_Description'
        ORDER BY s.name, t.name, c.column_id
    """)
    columns_raw = fetchall_dict(cur)

    # Indexes
    cur.execute("""
        SELECT
            s.name              AS [schema],
            t.name              AS table_name,
            i.name              AS index_name,
            i.is_unique         AS is_unique,
            i.is_primary_key    AS is_primary,
            STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
        FROM sys.indexes i
        JOIN sys.tables t        ON t.object_id = i.object_id
        JOIN sys.schemas s       ON s.schema_id = t.schema_id
        JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
        JOIN sys.columns c       ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE i.name IS NOT NULL
        GROUP BY s.name, t.name, i.name, i.is_unique, i.is_primary_key
        ORDER BY s.name, t.name, i.name
    """)
    indexes_raw = fetchall_dict(cur)

    # Foreign keys
    cur.execute("""
        SELECT
            s.name              AS [schema],
            tp.name             AS table_name,
            cp.name             AS column_name,
            sr.name             AS ref_schema,
            tr.name             AS ref_table,
            cr.name             AS ref_column,
            fk.name             AS constraint_name
        FROM sys.foreign_key_columns fkc
        JOIN sys.foreign_keys fk ON fk.object_id = fkc.constraint_object_id
        JOIN sys.tables tp       ON tp.object_id = fkc.parent_object_id
        JOIN sys.schemas s       ON s.schema_id = tp.schema_id
        JOIN sys.columns cp      ON cp.object_id = fkc.parent_object_id AND cp.column_id = fkc.parent_column_id
        JOIN sys.tables tr       ON tr.object_id = fkc.referenced_object_id
        JOIN sys.schemas sr      ON sr.schema_id = tr.schema_id
        JOIN sys.columns cr      ON cr.object_id = fkc.referenced_object_id AND cr.column_id = fkc.referenced_column_id
        ORDER BY s.name, tp.name
    """)
    fks_raw = fetchall_dict(cur)

    # Views
    cur.execute("""
        SELECT s.name AS [schema], v.name AS name, m.definition
        FROM sys.views v
        JOIN sys.schemas s ON s.schema_id = v.schema_id
        JOIN sys.sql_modules m ON m.object_id = v.object_id
        ORDER BY s.name, v.name
    """)
    views_raw = fetchall_dict(cur)

    cur.close()
    conn.close()

    return _build_result(tables_raw, columns_raw, indexes_raw, fks_raw, views_raw, dbname)


# ---------------------------------------------------------------------------
# Build unified result
# ---------------------------------------------------------------------------

def _build_result(tables_raw, columns_raw, indexes_raw, fks_raw, views_raw, dbname: str) -> dict:
    # Group columns by table key
    col_map: dict[tuple, list] = {}
    for c in columns_raw:
        key = (c["table_schema"], c["table_name"])
        col_map.setdefault(key, []).append({
            "name":        c["column_name"],
            "type":        _format_type(c),
            "nullable":    c["is_nullable"] == "YES",
            "default":     c.get("column_default"),
            "primary_key": bool(c["is_primary_key"]),
            "description": c.get("description"),
        })

    # Group indexes
    idx_map: dict[tuple, list] = {}
    for i in indexes_raw:
        key = (i.get("schema", i.get("table_schema", "")), i["table_name"])
        idx_map.setdefault(key, []).append({
            "name":    i["index_name"],
            "columns": i["columns"],
            "unique":  bool(i["is_unique"]),
            "primary": bool(i["is_primary"]),
        })

    # Group foreign keys
    fk_map: dict[tuple, list] = {}
    for f in fks_raw:
        key = (f.get("schema", f.get("table_schema", "")), f["table_name"])
        fk_map.setdefault(key, []).append({
            "column":      f["column_name"],
            "ref_schema":  f.get("ref_schema", ""),
            "ref_table":   f["ref_table"],
            "ref_column":  f["ref_column"],
            "constraint":  f["constraint_name"],
        })

    tables = []
    for t in tables_raw:
        schema = t.get("schema", t.get("table_schema", ""))
        name   = t["name"]
        key    = (schema, name)
        tables.append({
            "schema":      schema,
            "name":        name,
            "description": t.get("description"),
            "row_estimate": int(t.get("row_estimate") or 0),
            "columns":     col_map.get(key, []),
            "indexes":     idx_map.get(key, []),
            "foreign_keys": fk_map.get(key, []),
        })

    views = [{"schema": v.get("schema", v.get("table_schema", "")), "name": v["name"], "definition": v.get("definition", "")} for v in views_raw]

    return {
        "database": dbname,
        "tables":   tables,
        "views":    views,
        "summary": {
            "table_count":  len(tables),
            "view_count":   len(views),
            "column_count": sum(len(t["columns"]) for t in tables),
            "index_count":  sum(len(t["indexes"]) for t in tables),
            "fk_count":     sum(len(t["foreign_keys"]) for t in tables),
        },
    }


def _format_type(col: dict) -> str:
    t = col.get("data_type", "")
    ml = col.get("character_maximum_length")
    np = col.get("numeric_precision")
    ns = col.get("numeric_scale")
    if ml and int(ml) > 0:
        return f"{t}({ml})"
    if np and ns:
        return f"{t}({np},{ns})"
    if np:
        return f"{t}({np})"
    return t
