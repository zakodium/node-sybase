var Sybase = require('../src/SybaseDB.js');

const db = new Sybase('localhost', '5000', 'testdb', 'sa', 'password');

async function run() {
  while (true) {
    try {
      const result = await db.query('select * from testTable', true);
      console.log(result);
    } catch (e) {
      console.log('query failed', e);
    }
    await wait(1000);
  }
}

run();

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showTables() {
  return db.query("SELECT * FROM sysobjects WHERE type = 'U'");
}

function createTable() {
  return db.query('create table testTable (name varchar(255))');
}

function insertValue() {
  const value = Math.random().toString(36).slice(2);
  return db.query(`insert into testTable values('${value}')`);
}

function listTestTable() {
  const value = Math.random().toString(36).slice(2);
  return db.query(`select * from testTable`);
}
