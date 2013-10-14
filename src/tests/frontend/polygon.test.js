
module("polygon")

  test('tojson', function() {
    var p = new Polygon({
      type: 'test',
      paths: [
        [ [0, 1], [1, 1], [1, 0] ],
        [ [5, 1], [1, 1], [1, 5] ]
      ]
    });
    equal(_.isEqual(p.toJSON().paths, [
        [ [0, 1], [1, 1], [1, 0], [0, 1] ],
        [ [5, 1], [1, 1], [1, 5], [5, 1] ]
    ]), true)
  });

  test('parse', function() {
    var p = new Polygon()
    var res = p.parse({
      type: 'test',
      paths: [
        [ [0, 1], [1, 1], [1, 0] ],
        [ [5, 1], [1, 1], [1, 5] ]
      ]
    });
    equal(_.isEqual(res.paths, [
        [ [0, 1], [1, 1], [1, 0] ],
        [ [5, 1], [1, 1], [1, 5] ]
    ]), true)

    var res = p.parse({
      type: 'test',
      paths: [
        [ [0, 1], [1, 1], [1, 0], [0, 1] ],
        [ [5, 1], [1, 1], [1, 5], [5, 1] ]
      ]
    });

    equal(_.isEqual(res.paths, [
        [ [0, 1], [1, 1], [1, 0] ],
        [ [5, 1], [1, 1], [1, 5] ]
    ]), true)

  });
