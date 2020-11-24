const util = require('util');

var Sybase = require('./src/SybaseDB.js');

const db = new Sybase('localhost', '5000', 'testdb', 'sa', 'password');

Sybase.prototype.query = util.promisify(Sybase.prototype.query);
Sybase.prototype.connect = util.promisify(Sybase.prototype.connect);

async function run() {
  await db.connect();
  const result = await showTables();
  console.log(result);
  db.disconnect();
}

run();

async function showTables() {
  await db.query("SELECT * FROM sysobjects WHERE type = 'U'");
}

async function createTable() {
  await db.query('CREATE TABLE testTable (name varchar(255))');
}

async function query(db, queryString, retry) {
  console.log('query', retry);
  try {
    const result = await db.query(queryString);
    return result;
  } catch (e) {
    if (retry) {
      // TODO: Should we add a condition here on the error message?
      // e.message.includes('JZ0C0')
      db.disconnect();
      connectionPromise = db.connect();
      await connectionPromise;
      const result = await query(db, queryString, false);
      return result;
    } else {
      throw e;
    }
  }
}
