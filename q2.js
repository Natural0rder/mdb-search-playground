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
