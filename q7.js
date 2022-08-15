db.hotelSearch.aggregate([
  {
    $search: {
      "compound": {
        "must": [
          {
            "autocomplete": {
              "query": "[word]",
              "path": "hotelName",
              "fuzzy": {
                "maxEdits": 2,
                "prefixLength": 3
              }
            }
          },
          {
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
        ]
      }
    }
  },
  {
    $project: {
      "_id": 0,
      "propertyId": 1,
      "hotelName": 1,
      score: {
        $meta: "searchScore"
      }
    }
  }
])
