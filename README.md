
# mdb-search-playground

A set of queries to play with aggregate() and $search on a collection that stores hotels.

## Classic aggregation pipeline samples

Create a 2dsphere index

```
use hotel
db.hotelSearch.createIndex({ geoCode : "2dsphere", amenityCodes : 1 })
```

### 10 nearest hotels within a 1 KM radius from Roma center sorted (asc) by calculated spherical distance 

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

## $search samples
