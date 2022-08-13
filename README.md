
# mdb-search-playground

A set of queries to play with aggregate() and $search on a collection that stores hotels.
Same physical hotel can match multiple documents as they are proposed by different providers (provider identifier = dupeId, provider functional identifier = chainCode + iataCode).

## Classic aggregation pipeline samples

Create a 2dsphere index:

```
use hotel
db.hotelSearch.createIndex({ geoCode : "2dsphere", amenityCodes : 1 })
```

### Q1: 10 nearest hotels within a 1 KM radius from Roma center sorted (asc) by calculated spherical distance 

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
```

### Q2: Q1 + restriction on hotels providing all given amenities

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
