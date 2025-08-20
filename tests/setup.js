beforeAll((done) => {
  console.log('Setting up test database...');
  done();
});

afterAll((done) => {
  console.log('Cleaning up test database...');
  done();
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});
