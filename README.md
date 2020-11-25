# node-sybase

A simple node.js wrapper around a Java application that provides easy access to Sybase databases via jconn3. The main goal is to allow easy installation without the requirements of installing and configuring odbc or freetds. You do however have to have java 1.5 or newer installed.

# Requirements

- java 1.5+

# Install

## npm

```bash
npm install @zakodium/sybase
```

# Example

```javascript
const Sybase = require('sybase'),
  db = new Sybase('host', port, 'dbName', 'username', 'pw', 5000);

await db.connect();
const result = await db.query('select * from user where user_id = 42');
db.disconnect();
```

# API

```js
const db = new Sybase(
  host,
  port,
  dbName,
  username,
  password,
  timeout, // How much time we should wait for a response before generating an error
  logTiming, // Print timing information to the console
);
```

The java Bridge now optionally looks for a "sybaseConfig.properties" file in which you can configure jconnect properties to be included in the connection. This should allow setting properties like:

```properties
ENCRYPT_PASSWORD=true
```

# Run locally

You can run a sybase instance by using the [datagrip/sybase:15.7](https://hub.docker.com/layers/datagrip/sybase/15.7/images/sha256-4bd6f2f3dcb8bfbee5cac3dadb3a554ddd42e2af552ff1bca77e2e0c39be5a65?context=explore) docker image.

Instructions are on the [Readme](https://github.com/DataGrip/docker-env/tree/master/sybase/15.7)

It should probably also work with the latest image, but 15.7 has a smaller footprint
