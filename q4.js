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
