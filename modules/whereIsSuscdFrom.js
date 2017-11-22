countries = ['Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina', 'Burundi'];

module.exports.run_whereIsSuscdFrom = function (r, p, reply) {
  reply(countries[Math.floor(Math.random() * countries.length)]);
};
