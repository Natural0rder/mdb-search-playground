
# mdb-search-playground

A set of queries to play with aggregate() and $search on a collection that stores hotels.

## Classic aggregation pipeline samples

Create a 2dsphere index

```
use hotel
db.hotelSearch.createIndex({ geoCode : "2dsphere", amenityCodes : 1 })
```

### Fetch 10 nearest hotels from Roma center with a 1KM radius

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
  }
])
```

## $search samples
