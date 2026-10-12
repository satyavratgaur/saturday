/** Night = Saturday 18:00 → Sunday 06:00 in the viewer's local time. */
export function isNightAt(d: Date) {
  const day = d.getDay();
  const h = d.getHours();
  return (day === 6 && h >= 18) || (day === 0 && h < 6);
}

/**
 * Runs inline in <head> before paint so there's no flash.
 * `?theme=night|day` overrides for previewing.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var p=new URLSearchParams(location.search).get('theme');
var d=new Date(),w=d.getDay(),h=d.getHours();
var night=(w===6&&h>=18)||(w===0&&h<6);
var t=p==='night'||p==='day'?p:(night?'night':'day');
document.documentElement.dataset.theme=t;
document.documentElement.dataset.baseTheme=t;
}catch(e){}})();`;
