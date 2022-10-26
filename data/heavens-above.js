/**
 * Takes the Heavens Above data and massages it into something more useful for my purposes.
 *
 *   node heavens-above.js > output.json
 */

const heavensAbove = require('./heavens-above.json');

const stars = [];
const lines = heavensAbove.lines.map(line =>
	line.map(star => {
		const starData = heavensAbove.line[`s${star}`];
		if (!starData) {
			throw new Error(`Invalid reference "${star}"`);
		}
		let index = stars.indexOf(starData);
		if (index === -1) {
			index = stars.length;
			stars.push(starData);
		}
		return index;
	})
);

console.log(
	JSON.stringify(
		{
			stars: stars.map(data => data.slice(0, 2)),
			lines
		},
		null,
		'\t'
	)
);
