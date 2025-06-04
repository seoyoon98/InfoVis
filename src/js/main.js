import { drawGenreAssociation } from './vis_genre_association.js';
import { drawBookFinder } from './vis_book_finder.js';
import { drawRatingFactors } from './vis_rating_factors.js';

let cachedData = null;

async function loadData() {
  const data = await d3.csv("data/goodbooks-10k-master/merged_books.csv");
  data.forEach(d => {
    d.average_rating = +d.average_rating;
    d.ratings_count = +d.ratings_count;
    d.to_read_count = +d.to_read_count;
  });
  return data;
}

loadData().then(data => {
  cachedData = data;
  drawGenreAssociation(cachedData);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === "tab1") drawGenreAssociation(cachedData);
      else if (tab === "tab2") drawBookFinder(cachedData);
      else if (tab === "tab3") drawRatingFactors(cachedData);
    });
  });
});
