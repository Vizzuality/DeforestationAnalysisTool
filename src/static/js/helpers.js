window.log = function(){
  log.history = log.history || [];
  log.history.push(arguments);
  arguments.callee = arguments.callee.caller;  
  if(this.console) console.log( Array.prototype.slice.call(arguments) );
};
(function(b){function c(){}for(var d="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),a;a=d.pop();)b[a]=b[a]||c})(window.console=window.console||{});


function format_date(d, sep) {
     if( typeof(d) != 'object') {
        d = new Date(d);
     }
     sep = sep || '/';
     return  (d.getUTCMonth()+1) + sep + d.getUTCDate() + sep + d.getUTCFullYear();
}
