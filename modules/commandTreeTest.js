module.exports.commands = {
  commandTree: {
    _default: function(x,y,reply) {
      reply("Valid further arguments: child1, child2");
    },
    child1: function(x,y,reply) {
      reply("commandTree -> child1: (remainder, parts) =(",x+",",y,")");
    },
    child2: {
      _default: function(x,y,reply) {
        reply("valid further arguments: hello, world");
      },
      hello: function(x,y,reply) {
      reply("commandTree -> child2 -> hello: (remainder, parts) =(",x+",",y,")");
      },
      world: function(x,y,reply) {
        reply("commandTree -> child2 -> world: (remainder, parts) =(",x+",",y,")");
      }
    },
    child3: {
      // doing !commandTree child3 calls the commandTree._default because there is no child3._default.
      inherit: {
        _default: null, //override the commandTree._default
        over: function(x,y,r) {
          r("Over and out, roger");
        }
      }
    }
  }
};
