# neverball-solid

neverball-solid parses Neverball SOL files.

[Neverball](https://neverball.org) is a rolling-ball game and SOL is the binary format used for its levels and models.

## Install

```
$ npm install neverball-solid
```

## Usage

```js
var Solid = require('neverball-solid');

document.addEventListener('DOMContentLoaded', function () {
    var reader = new FileReader();

    reader.onload = function () {
        var sol = Solid(reader.result);
        var total = 0;

        for (var i = 0; i < sol.items.length; ++i) {
            if (sol.items[i].t === Solid.ITEM_COIN) {
                total += sol.items[i].n;
            }
        }

        console.log('Coins: $' + total);
    };

    var fileInput = document.querySelector('input[type="file"]');

    fileInput.addEventListener('change', function () {
        if (!fileInput.files.length) {
            return;
        }
        reader.readAsArrayBuffer(fileInput.files[0]);
    });
});
```

## API

```js
var Solid = require('neverball-solid');
```

### var sol = Solid(buffer)

Load the SOL data from `buffer`. `buffer` can be an ArrayBuffer obtained from an XMLHttpRequest or a FileReader; it can also be a Node.js Buffer. Throw if 1) the buffer does not contain SOL data or 2) the loader doesn't support the reported SOL version.

## Constants

All of the SOL constants for material flags, item types, etc., are available as properties of the exported object.

## Notation

neverball-solid largely adopts the same kind of terse notation for the various SOL attributes that's used in [`share/solid_base.h`](https://github.com/Neverball/neverball/blob/master/share/solid_base.h). The only deviation from that is the addition of aliases, e.g., sol.items is an alias for sol.hv.

## License

GPL-3.0+

