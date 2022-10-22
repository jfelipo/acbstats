import * as duckdb from "@duckdb/duckdb-wasm";
import * as Plot from "@observablehq/plot";
import { tooltip } from "./tooltip-mark";
// https://observablehq.com/@fil/experimental-plot-tooltip-01#addTooltip
const Tooltip = tooltip(Plot);

const DATA_URL = process.env.DATA_URL;

async function main(data: any[], xfield: string, xtitle: string, yfield: string, ytitle: string): Promise<void> {
  const chartSize = 800;
  const chart = Plot.plot({
    width: chartSize,
    height: chartSize,
    grid: true,
    style: {
      background: "#fff9eb",
    },
    x: {
      label: xtitle,
    },
    y: {
      label: ytitle,
    },
    marks: [
      Plot.dot(data, {x: xfield, y: yfield}),
      Tooltip(data, {x: xfield, y: yfield, content: "PLAYER_NAME"})
    ],
  });

  document.querySelector("#plot")?.append(chart);
}

async function initDuckDb(): Promise<duckdb.AsyncDuckDBConnection> {
  // I'm not serving this from my own CDN because it seems pretty complicated
  // to do so due to web workers not being able to make CORS requests without
  // annoying workarounds, see:
  //
  // https://github.com/duckdb/duckdb-wasm/discussions/419#discussioncomment-1704798
  // https://stackoverflow.com/questions/21913673/execute-web-worker-from-different-origin
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript",
    })
  );

  // Instantiate the asynchronus version of DuckDB-wasm
  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  return await db.connect();
}

window.addEventListener("DOMContentLoaded", async (_evt) => {
  const conn = await initDuckDb();
  await conn.query(`
      CREATE TABLE players AS
          SELECT * FROM "${DATA_URL}/playerstats.parquet"
  `);
  window.conn = conn;
  const data = await conn.query(`
      WITH player_stats AS (
        select *, ntile(100) over (order by fga) as fga_pctile
        FROM players
        WHERE year='2022'
      )
      SELECT *
      FROM player_stats
      WHERE fga_pctile > 25`
  );
  const jsdata = data.toArray().map(x => x.toJSON());
  await main(jsdata, "TS_PCT", "True Shooting %", "USG_PCT", "Usage %");
});
