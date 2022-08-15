db.hotelSearch.aggregate([
    {
      $search: {
        "geoWithin": {
          "circle": {
            "center": {
              "type": "Point",
              "coordinates": [
                12.496366,
                41.902782
              ]
            },
            "radius": 10000
          },
          "path": "geoCode"
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
    }
  ])
