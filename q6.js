db.hotelSearch.aggregate([
    {
      $search: {
        "near": {
          "origin": {
            "type": "Point",
            "coordinates": [
              12.496366,
              41.902782
            ]
          },
          "pivot": 1000,
          "path": "geoCode"
        }
      }
    },
    {
      $limit: 10
    },
    {
      $project: {
        "_id": 0,
        "propertyId": 1,
        "hotelName": 1,
        "distance": {
          $divide: [
            {
              $subtract: [
                1000,
                {
                  $multiply: [
                    {
                      $meta: "searchScore"
                    },
                    1000
                  ]
                }
              ]
            },
            {
              $meta: "searchScore"
            }
          ]
        }
      }
    }
  ])