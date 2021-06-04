const fs = require('fs');
const months = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

if (require.main === module) {
  fs.readdirSync('.').forEach((file) => {
    const matches = /(.*)-(\d*)\.(.*)$/.exec(file);
    if (!matches) return;
    const [full, mo, yr, ext] = matches;
    fs.renameSync(file, `${yr}-${pad(months.indexOf(mo) + 1, 2)}.${ext}`);
  });
}
