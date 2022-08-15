
# mdb-search-playground

A set of queries to play with aggregate() and $search on a collection that stores hotels.
- Same physical hotel can match multiple documents as they are proposed by different providers.
- Provider technical identifier = dupeId.
- Provider functional identifier = chainCode + iataCode.

Document sample:

```
{
  "_id": {
    "$oid": "62fab34fad0e4b15081bfaa5"
  },
  "iataCode": "ZAZ",
  "propertyId": "XAZAZOLZ",
  "chainCode": "XA",
  "geoCode": {
    "type": "Point",
    "coordinates": [
      {
        "$numberDouble": "12.4247457"
      },
      {
        "$numberDouble": "41.8918075"
      }
    ]
  },
  "address": {
    "line1": "94 Via di Torre Rossa",
    "postalCode": "00165",
    "countryCode": "IT",
    "cityName": "ROMA"
  },
  "amenityCodes": [
    "RMA.23",
    "RMA.49",
    "RMA.44",
    "RMA.46",
    "RMA.50",
    "RMA.42",
    "RMA.32",
    "RMA.13",
    "RMA.76",
    "RMA.40",
    "RMA.64",
    "RMA.76",
    "RMA.36",
    "RMA.82",
    "RMA.82",
    "RMA.97"
  ],
  "hotelName": "Domus Pacis Torre Rossa Park",
  "dupeId": {
    "$numberInt": "128564"
  },
  "bestTransportation": {
    "$numberInt": "0"
  },
  "primaryLocation": "ROM"
}
```

You can unzip hotelSearch.bson.cpgz and restore hotelSearch.bson with mongorestore (https://www.mongodb.com/docs/database-tools/mongorestore/) on your MongoDB instance.
On MongoDB Atlas:

```
mongorestore --uri mongodb+srv://<USER>:<PASSWORD>@<FQDN> /<PATH>/hotelSearch.bson
```

## Classic aggregation pipeline samples

Create a compound index:

```
use hotel
db.hotelSearch.createIndex({ geoCode : "2dsphere", "address.countryCode" : 1, "address.postalCode" : 1, amenityCodes : 1 })
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
```

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

### Q5: Equivalent with $search

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
        "pivot": 10000,
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

### Q7: Hotels within a 1OKM radius circle from Roma center with a fuzzy autocompletion on hotel names

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
```

### Q8: 100 first hotels within a 10KM radius circle from Roma center grouped by physical hotel

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
```
