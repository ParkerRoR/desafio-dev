const db = require('../database/db');

beforeAll((done) => {
  console.log('Setting up test database...');
  done();
});

afterAll((done) => {
  console.log('Cleaning up test database...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    }
    done();
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});
