/**
 * Created by exolution on 17/3/8.
 */
const Router = require('mlink').Router;
const debuggerRouter = Router.get('debugger');
debuggerRouter.registerHandler(function (message) {
  if (message.payload.method === 'Debugger.scriptParsed' || message.payload.result && message.payload.result.frameTree) {
       // message.to('proxy.inspector')
    message.discard();
  }
  else {
           // logger.log( message)
    message.to('proxy.inspector');
  }
}).at('runtime.proxy');