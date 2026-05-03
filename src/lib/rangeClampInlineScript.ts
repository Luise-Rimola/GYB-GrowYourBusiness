/**
 * Synchronously clamp Range#setEnd / #setStart offsets (fixes IndexSizeError).
 * Inlined in root layout `<head>` so it runs during HTML parse — before Next chunks.
 *
 * Single source: imported by root layout only.
 */
export const RANGE_CLAMP_INLINE_SCRIPT = `
(function(){try{
if(typeof Range==="undefined")return;
var k="__bdss_range_clamp_installed";
if(Range.prototype[k])return;
function c(n,o){
if(typeof o!=="number"||o!==o||o===1/0||o===-1/0)return 0;
o=Math.trunc(o);if(o<0)return 0;
var t=n.nodeType;
if(t===3||t===8||t===4||t===7)return Math.min(o,n.length);
if(t===1||t===11||t===9)return Math.min(o,n.childNodes.length);
return o;}
var pe=Range.prototype.setEnd;
var ps=Range.prototype.setStart;
Range.prototype.setEnd=function(n,o){return pe.call(this,n,c(n,o));};
Range.prototype.setStart=function(n,o){return ps.call(this,n,c(n,o));};
Range.prototype[k]=true;
}catch(_){}})();
`.trim();
