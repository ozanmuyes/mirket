module.exports = {
  defer: true,
  boot() {
    console.log('this ("baz") will be the 2nd to the last provider');
  },
};
