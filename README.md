
# mdb-search-playground

## Classic aggregation pipeline samples

Create a 2dsphere index

```
use hotel
db.hotelSearch.createIndex({ geoCode : "2dsphere", amenityCodes : 1 })
```

## $search samples
