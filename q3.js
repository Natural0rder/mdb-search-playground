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
      $match: {
        amenityCodes: {
          $all: [
            "RMA.95",
            "RMA.13"
          ]
        }
      }
    },
    {
      $limit: 100
    },
    {
      $group: {
        _id: {
          "physicalHotel": "$dupeId",
          "distance": "$dist.calculated",
          "name": "$hotelName",
          "amenities": "$amenityCodes"
        },
        offersCount: {
          $sum: 1
        },
        hotels: {
          $push: {
            provider: {
              $concat: [
                "$chainCode",
                "-",
                "$iataCode"
              ]
            },
            property: "$propertyId"
          }
        }
      }
    },
    {
      $sort: {
        "_id.distance": 1
      }
    }
  ])