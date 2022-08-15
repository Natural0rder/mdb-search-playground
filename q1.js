db.hotelSearch.aggregate([
  {
    $geoNear: {
      near: {
        type: "Point",
        coordinates: [
          12.496366,
          41.902782
        ]
      },
      distanceField: "dist.calculated",
      maxDistance: 10000,
      spherical: true
    }
  },
  {
    $limit: 100
  },
  {
    $project: {
      _id: 0,
      hotelName: 1,
      propertyId: 1,
      "dist.calculated": 1
    }
  }
])

db.hotelSearch.aggregate([
  {
    $geoNear: {
      near: {
        type: "Point",
        coordinates: [
          12.496366,
          41.902782
        ]
      },
      distanceField: "dist.calculated",
      maxDistance: 10000,
      spherical: true
    }
  },
  {
    $group: {
      _id: {
        name: "$hotelName",
        distance: "$dist.calculated"
      },
      desc: {
        $push: {
          propertyId: "$propertyId"
        }
      }
    }
  },
  {
    $limit: 100
  }
])
