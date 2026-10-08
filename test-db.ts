import { dbConnect } from "./lib/dbConnect"; async function run() { try { await dbConnect(); console.log("Success"); } catch(e) { console.error(e); } } run();
