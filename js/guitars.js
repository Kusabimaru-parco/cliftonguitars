// Guitars page entry: the guitar list loads first and is light (pictures only, no 3D engine);
// the 3D viewer (three.js + the procedural guitar) loads only once a guitar is opened (?model=…).
if (new URLSearchParams(location.search).has('model')) import('./viewer.js');
else import('./shop.js');
