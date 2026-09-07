function escapeText(s: string) { return s.replaceAll("\\", "\\\\").replace(/\r?\n/g,"\\n").replaceAll(";","\\;").replaceAll(",","\\,"); }
function fold(line: string) {
  let current="", size=0; const lines:string[]=[];
  for (const char of line) { const n=new TextEncoder().encode(char).length; if(size+n>73){lines.push(current);current=" ";size=1;} current+=char;size+=n; }
  lines.push(current);return lines.join("\r\n");
}
export function eventCalendar(e:{id:string;title:string;description:string;eventDate:string;eventTime:string}) {
  const date=e.eventDate.replaceAll("-","");
  const start=new Date(`${e.eventDate}T${e.eventTime || "00:00"}:00Z`);
  const end=new Date(start.getTime()+(e.eventTime?3600000:86400000));
  const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
  const dates=e.eventTime?[`DTSTART:${date}T${e.eventTime.replace(":","")}00`,`DTEND:${stamp(end).slice(0,-1)}`]:[`DTSTART;VALUE=DATE:${date}`,`DTEND;VALUE=DATE:${stamp(end).slice(0,8)}`];
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mezhdu Nami//Calendar//RU","CALSCALE:GREGORIAN","BEGIN:VEVENT",`UID:${e.id}@mezhdu-nami`,`DTSTAMP:${stamp(new Date())}`,...dates,`SUMMARY:${escapeText(e.title)}`,`DESCRIPTION:${escapeText(e.description)}`,"END:VEVENT","END:VCALENDAR"].map(fold).join("\r\n")+"\r\n";
}
