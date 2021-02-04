const { Review } = require('../database/model.js');
const { items } = require('../database/database_couchDb/index.js');
const { pgPool } = require('../database/database_postgres/index.js');

// MySQL + Sequalize
const model = {
  mysqlSequalize: {
    // GET
    findAll: (itemId) => Review.findAll({
      where: {
        ItemId: itemId,
      },
    }),
    // POST
    create: (newReview) => Review.create(newReview),
    // DELETE
    destroy: (reviewId) => Review.destroy({
      where: { id: reviewId },
    }),
    // UPDATE
    update: (updatedFields, reviewId) => Review.update(updatedFields, {
      where: { id: reviewId },
    }),
  },

  couchDb: {
    // GET - '/api/items/:itemId/reviews'
    findAll: (itemId) => {
      let itemBuild = itemId[itemId.length - 1];
      // console.log('searching ' + `${itemBuild}:${itemId}`);
      return items.get(`${itemBuild}:${itemId}`)
        .then((result) => {
          // console.log(result);
          return result.reviews;
        });
    },
    // POST - '/api/items/:itemId/reviews'
    create: (newReview) => {
      let itemId = newReview.ItemId;
      let itemBuild = itemId[itemId.length - 1];
      //console.log('searching ' + `${itemBuild}:${itemId}`);
      return items.get(`${itemBuild}:${itemId}`)
        .then((item) => {
          let idArr = item.reviews.map((review) => {
          return review.id;
        });
          newReview.id = Math.max(...idArr) + 1;
          item.reviews.push(newReview);
          return items.insert(item);
        });
    },
    // DELETE - '/api/items/:itemId/reviews/:reviewId'
    destroy: (reviewId, itemId) => {
      let itemBuild = itemId[itemId.length - 1];
      console.log('delete ' + `${itemBuild}:${itemId} , review ${reviewId}`);
      return items.get(`${itemBuild}:${itemId}`)
        .then ((item) => {
        //console.log('found item');
          for (let j = 0; j < item.reviews.length; j++) {
            if (item.reviews[j].id === Number(reviewId)) {
              item.reviews.splice(j, 1);
              return items.insert(item);
            }
          }
          console.log("not found");
          return { ok: false };
        })
        .then((couchRes) => {
          if (couchRes.ok === true) {
            return 1;
          }
          return `${reviewId} for ${itemId} couldn't be deleted`;
        });
    },
    // UPDATE - '/api/items/:itemId/reviews/:reviewId'
    update: (updatedFields, reviewId, itemId) => {
      let itemBuild = itemId[itemId.length - 1];
      let itemIdWithPartition = `${itemBuild}:${itemId}`;
      console.log('update ' + `${itemIdWithPartition} , review ${reviewId}`);
      return items.get(itemIdWithPartition)
        .then((item) => {
          for (let k = 0; k < item.reviews.length; k++) {
            let review = item.reviews[k];
            if (review.id === Number(reviewId)) {
              for (let key in updatedFields) {
                review[key] = updatedFields[key];
              }
              console.log("About to insert", item._id);
              return items.insert(item);
            }
          }
          console.log("not found");
          return { ok: false };
        })
        .then((couchRes) => {
          if (couchRes.ok === true) {
            return 1;
          }
          return `${reviewId} for ${itemId} couldn't be updated`;
        });
    },
  },
  postgreSQL: {
    // GET - '/api/items/:itemId/reviews'
    findAll: (itemId) => {
      return pgPool.connect()
        .then((client) => {
          return client.query(`SELECT * FROM Reviews WHERE itemId = ${itemId}`)
        })
        .then(res => {
          return res.rows;
        })
      },
    // POST - '/api/items/:itemId/reviews'
    create: (newReview) => {
      const query = {
        text: 'INSERT INTO reviews (customer_name,date_of_review,rating,review_content,image_url,item_option,ItemId) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        values: [newReview.customer_name,newReview.date_of_review,newReview.rating,newReview.review_content,newReview.image_url,newReview.item_option,newReview.ItemId],
      };
      return pgPool.connect()
        .then((client) => {
          return client.query(query);
        })
      .then(res => {
        if (res.rowCount === 1) {
          return (`A new review for itemId ${newReview.ItemId} was inserted succesfuly`);
        }
        return (`A new review for itemId ${newReview.ItemId} could not be inserted`);
      });
    },
   // UPDATE - '/api/items/:itemId/reviews/:reviewId'
    update: (updatedFields, reviewId, itemId) => {
      const query = {
        text: 'UPDATE reviews SET customer_name = $1 ,date_of_review = $2,rating = $3,review_content= $4,image_url =$5,item_option=$6 WHERE id=$7',
        values: [updatedFields.customer_name,updatedFields.date_of_review,updatedFields.rating,updatedFields.review_content,updatedFields.image_url,updatedFields.item_option,reviewId]
      };
      return pgPool.connect()
      .then((client) => {
        return client.query(query);
      })
      .then(res => {
        return (res.rowCount);
      });
    },
    // DELETE - '/api/items/:itemId/reviews/:reviewId'
    destroy: (reviewId, itemId) => {
      const query = {
        text: 'DELETE FROM reviews WHERE id=$1',
        values: [reviewId],
      };
      return pgPool.connect()
        .then((client) => {
          return client.query(query);
        })
        .then(res => {
          return (res.rowCount);
        });
    },

},
};


// module.exports = model.mysqlSequalize;
// module.exports = model.couchDb;
module.exports = model.postgreSQL;



// pool.connect()
//     .then((client) => {
//         client.query(`SELECT * FROM Reviews WHERE itemId = ${itemId}`)
//             .then(res => {
//                 for (let row of res.rows) {
//                     console.log(row);
//                 }
//             })
//             .catch(err => {
//                 console.log(`could not retrieve the review for itemId ${itemId}`);
//             });
//     })
//     .catch(err => {
//         console.error(err);
//     });

//     SELECT * FROM Reviews WHERE itemid =37
// // // GET all users
// const getReviews = (request, response) => {
//   pool.query(`SELECT * FROM Reviews WHERE itemId = ${itemId}`, (error, results) => {
//     if (error) {
//       throw error
// console.log(`could not retrieve the review for itemId ${itemId}`)
//     }
//     response.status(200).json(results.rows)
//   })
// }



// // DELETE
// const deleteUser = (request, response) => {
//   const id = parseInt(request.params.id)

//   pool.query('DELETE FROM users WHERE id = $1', [id], (error, results) => {
//     if (error) {
//       throw error
//     }
//     response.status(200).send(`User deleted with ID: ${id}`)
//   })
// }



// // to run from the terminal
// // post
//   curl --data "name=Elaine&email=elaine@example.com"
// http://localhost:3000/users

// // update/ put
// curl -X PUT -d "name=Kramer" -d "email=kramer@example.com"
// http://localhost:3000/users/1

// // delete
// curl -X "DELETE" http://localhost:3000/users/1
// */



// pool.connect()
//     .then((client) => {
//         client.query(`SELECT * FROM Reviews WHERE itemId = ${itemId}`)
//             .then(res => {
//                 for (let row of res.rows) {
//                     console.log(row);
//                 }
//             })
//             .catch(err => {
//                 console.log(`could not retrieve the review for itemId ${itemId}`);
//             });
//     })
//     .catch(err => {
//         console.error(err);
//     });




// INSERT INTO reviews (customer_name,date_of_review,rating,review_content,image_url,item_option,ItemId) VALUES ('Shaul Bokboza','March 9 2020',4,'kkkkkklklklkl klklklkklk','https://fetsy-reviews-sdc.s3.us-east-2.amazonaws.com/images/58.jpg', 'black', 2);
