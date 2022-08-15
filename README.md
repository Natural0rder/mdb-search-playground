
# mdb-search-playground

A set of queries to play with aggregate() and $search on a collection that stores hotels.
Same physical hotel can match multiple documents as they are proposed by different providers (provider identifier = dupeId, provider functional identifier = chainCode + iataCode).

## Classic aggregation pipeline samples

Create a 2dsphere index:

```
use hotel
db.hotelSearch.createIndex({ geoCode : "2dsphere", amenityCodes : 1 })
```

### Q1: 100 nearest hotels within a 10 KM radius from Roma center sorted (asc) by calculated spherical distance 

```
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
```

With distinct hotel names

```
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


### Q2: Q1 + restriction on hotels providing all given amenities and matching country + zip code

```
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
    $match: {
      "address.countryCode": "IT",
      "address.postalCode": {
        $in: [
          "00136",
          "00141",
          "00198",
          "00146",
          "00147",
          "00153",
          "00155",
          "00156",
          "00158",
          "00159",
          "00161",
          "00164",
          "00165",
          "00172",
          "00176",
          "00182",
          "00183",
          "00184",
          "00185",
          "00186",
          "00187",
          "00192",
          "00193",
          "00197"
        ]
      },
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
    $project: {
      _id: 0,
      hotelName: 1,
      propertyId: 1,
      "dist.calculated": 1
    }
  }
])
```

### Q3: Q2 + logical hotels grouped by physical hotel (hotel name, distance from Roma center, amenities)

```
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
    $match: {
      "address.countryCode": "IT",
      "address.postalCode": {
        $in: [
          "00136",
          "00141",
          "00198",
          "00146",
          "00147",
          "00153",
          "00155",
          "00156",
          "00158",
          "00159",
          "00161",
          "00164",
          "00165",
          "00172",
          "00176",
          "00182",
          "00183",
          "00184",
          "00185",
          "00186",
          "00187",
          "00192",
          "00193",
          "00197"
        ]
      },
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
 ```

## $search samples

Create a Search compound index on geoCode (geo type) and hotelName (autocomplete type)

```
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "geoCode": {
        "type": "geo"
      },
      "hotelName": [
        {
          "foldDiacritics": true,
          "maxGrams": 15,
          "minGrams": 2,
          "tokenization": "edgeGram",
          "type": "autocomplete"
        }
      ]
    }
  }
}
```

### Q4: Autocompletion on hotel names

Replace [word] by your autocomplete input.

```
db.hotelSearch.aggregate([
  {
    $search: {
      "autocomplete": {
        "path": "hotelName",
        "query": "[word]"
      }
    }
  },
  {
    $limit: 10
  },
  {
    $project: {
      "_id": 0,
      "hotelName": 1
    }
  }
])
```

With distinct names

```
db.hotelSearch.aggregate([
  {
    $search: {
      "autocomplete": {
        "path": "hotelName",
        "query": "dom"
      }
    }
  },
  {
    $group: {
      _id: "$hotelName"
    }
  },
  {
    $limit: 10
  }
])
```

### Q5: $search equivalent with $search

```
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
          "radius": 1000
        },
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
      score: {
        $meta: "searchScore"
      }
    }
  }
])
```

### Q6: Q5 + calculated distances

```
              pivot
score = ------------------
         pivot + distance
```

```
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
```

### Q7: Hotels within a 1KM radius circle from Roma center with a fuzzy autocompletion on hotel names

Replace [word] by your fuzzy autocomplete input.

```
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
                "radius": 1000
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
```

### Q8: 100 first hotels within a 1KM radius circle from Roma center grouped by physical hotel

```
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
          "radius": 1000
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
```
