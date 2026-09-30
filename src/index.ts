import {startApp, findRestaurantBy, voteRestaurantBy, findMostVotedRestaurants} from "./server";

startApp(findRestaurantBy, voteRestaurantBy, findMostVotedRestaurants).listen(8080, () => {
  console.log("Dinner Roulette in ascolto su http://localhost:8080");
});
