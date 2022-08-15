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
