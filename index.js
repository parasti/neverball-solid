'use strict';

var Cursor = require('cursor');

function readFloatLEArray(stream, length) {
  var value = new Float32Array(length);
  for (var i = 0; i < length; ++i) {
    value[i] = stream.readFloatLE();
  }
  return value;
}

function readInt32LEArray(stream, length) {
  var value = new Int32Array(length);
  for (var i = 0; i < length; ++i) {
    value[i] = stream.readInt32LE();
  }
  return value;
}

/*
 * Neverball SOL loader.
 */
var Solid = module.exports = loadSol;

Solid.MAGIC = 0x4c4f53af;
Solid.VERSIONS = [7, 8, 9, 10];

/*
 * Material type flags.
 */
Solid.MTRL_LIT = (1 << 11);
Solid.MTRL_PARTICLE = (1 << 10);
Solid.MTRL_ALPHA_TEST = (1 << 9);
Solid.MTRL_REFLECTIVE = (1 << 8);
Solid.MTRL_TRANSPARENT = (1 << 7);
Solid.MTRL_SHADOWED = (1 << 6);
Solid.MTRL_DECAL = (1 << 5);
Solid.MTRL_ENVIRONMENT = (1 << 4);
Solid.MTRL_TWO_SIDED = (1 << 3);
Solid.MTRL_ADDITIVE = (1 << 2);
Solid.MTRL_CLAMP_S = (1 << 1);
Solid.MTRL_CLAMP_T = (1 << 0);

/*
 * Billboard flags.
 */
Solid.BILL_EDGE = 1;
Solid.BILL_FLAT = 2;
Solid.BILL_NOFACE = 4;

/*
 * Lump flags.
 */
Solid.LUMP_DETAIL = 1;

/*
 * Item types.
 */
Solid.ITEM_COIN = 1;
Solid.ITEM_GROW = 2;
Solid.ITEM_SHRINK = 3;

/*
 * Path flags.
 */
Solid.PATH_ORIENTED = 1;
Solid.PATH_PARENTED = 2;

/*
 * Load a SOL file from the given ArrayBuffer.
 */
function loadSol (buffer) {
  var stream = Cursor(buffer);

  var magic = stream.readInt32LE();

  if (magic !== Solid.MAGIC) {
    throw Error('Not a SOL file');
  }

  var version = stream.readInt32LE();

  if (!Solid.VERSIONS.includes(version)) {
    throw Error('SOL version ' + version + ' is not supported');
  }

  var ac = stream.readInt32LE();
  var dc = stream.readInt32LE();
  var mc = stream.readInt32LE();
  var vc = stream.readInt32LE();
  var ec = stream.readInt32LE();
  var sc = stream.readInt32LE();
  var tc = stream.readInt32LE();
  var oc = stream.readInt32LE();
  var gc = stream.readInt32LE();
  var lc = stream.readInt32LE();
  var nc = stream.readInt32LE();
  var pc = stream.readInt32LE();
  var bc = stream.readInt32LE();
  var hc = stream.readInt32LE();
  var zc = stream.readInt32LE();
  var jc = stream.readInt32LE();
  var xc = stream.readInt32LE();
  var rc = stream.readInt32LE();
  var uc = stream.readInt32LE();
  var wc = stream.readInt32LE();
  var ic = stream.readInt32LE();

  var sol = {};

  sol.version = version;

  sol.av = sol.bytes = Buffer.from(stream.slice(ac).buffer()); // Realloc.
  sol.dv = sol.dicts = loadDicts(stream, dc, sol.av);
  sol.mv = sol.mtrls = loadMtrls(stream, mc);
  sol.vv = sol.verts = loadVerts(stream, vc);
  sol.ev = sol.edges = loadEdges(stream, ec);
  sol.sv = sol.sides = loadSides(stream, sc);
  sol.tv = sol.texcs = loadTexcs(stream, tc);
  sol.ov = sol.offs = loadOffs(stream, oc);
  sol.gv = sol.geoms = loadGeoms(stream, gc);
  sol.lv = sol.lumps = loadLumps(stream, lc);
  sol.nv = sol.nodes = loadNodes(stream, nc);
  sol.pv = sol.paths = loadPaths(stream, pc);
  sol.bv = sol.bodies = loadBodies(stream, bc);
  sol.hv = sol.items = loadItems(version, stream, hc);
  sol.zv = sol.goals = loadGoals(version, stream, zc);
  sol.jv = sol.jumps = loadJumps(version, stream, jc);
  sol.xv = sol.switches = loadSwitches(version, stream, xc);
  sol.rv = sol.bills = loadBills(version, stream, rc);
  sol.uv = sol.balls = loadBalls(stream, uc);
  sol.wv = sol.views = loadViews(stream, wc);
  sol.iv = sol.indices = readInt32LEArray(stream, ic);

  if (sol.version <= 7) {
    var i;

    for (i = 0; i < sol.mv.length; ++i) {
      sol.mv[i].fl |= Solid.MTRL_LIT;
    }
    for (i = 0; i < sol.rv.length; ++i) {
      sol.mv[sol.rv[i].mi].fl &= ~Solid.MTRL_LIT;
    }
  }

  return sol;
}

function loadDicts (stream, count, byteBuffer) {
  var dicts = {};

  for (var i = 0; i < count; ++i) {
    var ai = stream.readInt32LE();
    var aj = stream.readInt32LE();

    var key = byteBuffer.toString('utf8', ai, byteBuffer.indexOf(0, ai));
    var val = byteBuffer.toString('utf8', aj, byteBuffer.indexOf(0, aj));

    if (val === '\n') {
      val = '';
    }

    if (key === 'message') {
      val = val.replace(/\\/g, '\n');
    }

    dicts[key] = val;
  }

  return dicts;
}

function loadMtrls (stream, count) {
  var mtrls = [];

  for (var i = 0; i < count; ++i) {
    var mtrl = {
      d: readFloatLEArray(stream, 4),
      a: readFloatLEArray(stream, 4),
      s: readFloatLEArray(stream, 4),
      e: readFloatLEArray(stream, 4),
      h: stream.readFloatLE(),
      fl: stream.readInt32LE()
    };

    var byteBuffer = stream.slice(64).buffer();
    mtrl.f = byteBuffer.toString('utf8', 0, byteBuffer.indexOf(0));

    if (mtrl.fl & Solid.MTRL_ALPHA_TEST) {
      mtrl.alphaFunc = stream.readInt32LE();
      mtrl.alphaRef = stream.readFloatLE();
    } else {
      mtrl.alphaFunc = 0;
      mtrl.alphaRef = 0.0;
    }

    mtrls.push(mtrl);
  }

  return mtrls;
}

function loadVerts (stream, count) {
  var verts = [];

  for (var i = 0; i < count; ++i) {
    verts.push(readFloatLEArray(stream, 3));
  }

  return verts;
}

function loadEdges (stream, count) {
  var edges = [];

  for (var i = 0; i < count; ++i) {
    edges.push({
      vi: stream.readInt32LE(),
      vj: stream.readInt32LE()
    });
  }

  return edges;
}

function loadSides (stream, count) {
  var sides = [];

  for (var i = 0; i < count; ++i) {
    sides.push({
      n: readFloatLEArray(stream, 3),
      d: stream.readFloatLE()
    });
  }

  return sides;
}

function loadTexcs (stream, count) {
  var texcs = [];

  for (var i = 0; i < count; ++i) {
    texcs.push(readFloatLEArray(stream, 2));
  }

  return texcs;
}

function loadOffs (stream, count) {
  var offs = [];

  for (var i = 0; i < count; ++i) {
    offs.push({
      ti: stream.readInt32LE(),
      si: stream.readInt32LE(),
      vi: stream.readInt32LE()
    });
  }

  return offs;
}

function loadGeoms (stream, count) {
  var geoms = [];

  for (var i = 0; i < count; ++i) {
    geoms.push({
      mi: stream.readInt32LE(),
      oi: stream.readInt32LE(),
      oj: stream.readInt32LE(),
      ok: stream.readInt32LE()
    });
  }

  return geoms;
}

function loadLumps (stream, count) {
  var lumps = [];

  for (var i = 0; i < count; ++i) {
    lumps.push({
      fl: stream.readInt32LE(),
      v0: stream.readInt32LE(),
      vc: stream.readInt32LE(),
      e0: stream.readInt32LE(),
      ec: stream.readInt32LE(),
      g0: stream.readInt32LE(),
      gc: stream.readInt32LE(),
      s0: stream.readInt32LE(),
      sc: stream.readInt32LE()
    });
  }

  return lumps;
}

function loadNodes (stream, count) {
  var nodes = [];

  for (var i = 0; i < count; ++i) {
    nodes.push({
      si: stream.readInt32LE(),
      ni: stream.readInt32LE(),
      nj: stream.readInt32LE(),
      l0: stream.readInt32LE(),
      lc: stream.readInt32LE()
    });
  }

  return nodes;
}

function loadPaths (stream, count) {
  var paths = [];

  var i, path;

  for (i = 0, path; i < count; ++i) {
    path = {
      p: readFloatLEArray(stream, 3),
      t: stream.readFloatLE(),
      pi: stream.readInt32LE(),
      f: stream.readInt32LE(),
      s: stream.readInt32LE(),
      fl: stream.readInt32LE(),
      p0: -1,
      p1: -1,
    };

    if (path.fl & Solid.PATH_ORIENTED) {
      var e = readFloatLEArray(stream, 4);

      // Convert Neverball's W X Y Z to glMatrix's X Y Z W.
      var w = e[0];

      e[0] = e[1];
      e[1] = e[2];
      e[2] = e[3];
      e[3] = w;

      // Orientation quaternion.
      path.e = e;
    } else {
      // Identity quaternion.
      path.e = new Float32Array([0, 0, 0, 1]);
    }

    if (path.fl & Solid.PATH_PARENTED) {
      path.p0 = stream.readInt32LE();
      path.p1 = stream.readInt32LE();

      if (path.p1 < 0)
          path.p1 = path.p0;
    }

    paths.push(path);
  }

  // Turn into a linked list.
  for (i = 0, path; i < paths.length; ++i) {
    path = paths[i];
    // May link to itself.
    path.next = paths[path.pi] || null;
  }

  return paths;
}

function loadBodies (stream, count) {
  var bodies = [];

  for (var i = 0; i < count; ++i) {
    bodies.push({
      pi: stream.readInt32LE(),
      pj: stream.readInt32LE(),
      ni: stream.readInt32LE(),
      l0: stream.readInt32LE(),
      lc: stream.readInt32LE(),
      g0: stream.readInt32LE(),
      gc: stream.readInt32LE()
    });

    if (bodies[i].pj < 0) {
      bodies[i].pj = bodies[i].pi;
    }
  }

  return bodies;
}

function loadItems (version, stream, count) {
  var items = [];

  for (var i = 0; i < count; ++i) {
    var item = {
      p: readFloatLEArray(stream, 3),
      t: stream.readInt32LE(),
      n: stream.readInt32LE(),
      p0: -1,
      p1: -1,
    };

    if (version >= 9) {
      item.p0 = stream.readInt32LE();
      item.p1 = stream.readInt32LE();
    }

    items.push(item);
  }

  return items;
}

function loadGoals (version, stream, count) {
  var goals = [];

  for (var i = 0; i < count; ++i) {
    var goal = {
      p: readFloatLEArray(stream, 3),
      r: stream.readFloatLE(),
      p0: -1,
      p1: -1,
    };

    if (version >= 9) {
      goal.p0 = stream.readInt32LE();
      goal.p1 = stream.readInt32LE();
    }

    goals.push(goal);
  }

  return goals;
}

function loadJumps (version, stream, count) {
  var jumps = [];

  for (var i = 0; i < count; ++i) {
    var jump = {
      p: readFloatLEArray(stream, 3),
      q: readFloatLEArray(stream, 3),
      r: stream.readFloatLE(),
      p0: -1,
      p1: -1,
    };

    if (version >= 9) {
      jump.p0 = stream.readInt32LE();
      jump.p1 = stream.readInt32LE();
    }

    jumps.push(jump);
  }

  return jumps;
}

function loadSwitches (version, stream, count) {
  var switches = [];

  for (var i = 0; i < count; ++i) {
    var swch = {
      p: readFloatLEArray(stream, 3),
      r: stream.readFloatLE(),
      pi: stream.readInt32LE(),
      t: readFloatLEArray(stream, 2)[0], // Consume unused padding.
      f: readFloatLEArray(stream, 2)[0], // Consume unused padding.
      i: stream.readInt32LE(),
      p0: -1,
      p1: -1,
    };

    if (version >= 9) {
      swch.p0 = stream.readInt32LE();
      swch.p1 = stream.readInt32LE();
    }

    switches.push(swch);
  }

  return switches;
}

function loadBills (version, stream, count) {
  var bills = [];

  for (var i = 0; i < count; ++i) {
    var bill = {
      fl: stream.readInt32LE(),
      mi: stream.readInt32LE(),
      t: stream.readFloatLE(),
      d: stream.readFloatLE(),

      w: readFloatLEArray(stream, 3),
      h: readFloatLEArray(stream, 3),
      rx: readFloatLEArray(stream, 3),
      ry: readFloatLEArray(stream, 3),
      rz: readFloatLEArray(stream, 3),
      p: readFloatLEArray(stream, 3),
      p0: -1,
      p1: -1,
    };

    if (version >= 9) {
      bill.p0 = stream.readInt32LE();
      bill.p1 = stream.readInt32LE();
    }

    bills.push(bill);
  }

  return bills;
}

function loadBalls (stream, count) {
  var balls = [];

  for (var i = 0; i < count; ++i) {
    balls.push({
      p: readFloatLEArray(stream, 3),
      r: stream.readFloatLE()
    });
  }

  return balls;
}

function loadViews (stream, count) {
  var views = [];

  for (var i = 0; i < count; ++i) {
    views.push({
      p: readFloatLEArray(stream, 3),
      q: readFloatLEArray(stream, 3)
    });
  }

  return views;
}
