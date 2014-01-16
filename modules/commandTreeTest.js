module.exports.commands = {
  commandTree: {
    child1: function(x,y,reply) {
      reply("commandTree -> child1: (remainder, parts) =(",x+",",y,")");
    },
    child2: {
      hello: function(x,y,reply) {
      reply("commandTree -> child2 -> hello: (remainder, parts) =(",x+",",y,")");
      },
      world: function(x,y,reply) {
        reply("commandTree -> child2 -> world: (remainder, parts) =(",x+",",y,")");
      }
    }
  }
};
