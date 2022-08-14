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
        maxDistance: 1000,
        spherical: true
      }
    },
    {
      $limit: 10
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
