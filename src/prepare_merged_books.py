import pandas as pd

# Load main data
books = pd.read_csv("data/goodbooks-10k-master/books.csv")
to_read = pd.read_csv("data/goodbooks-10k-master/to_read.csv")
book_tags = pd.read_csv("data/goodbooks-10k-master/book_tags.csv")
tags = pd.read_csv("data/goodbooks-10k-master/tags.csv")

# 1. Calculate to-read count per book
to_read_count = to_read['book_id'].value_counts().rename_axis('book_id').reset_index(name='to_read_count')

# 2. Merge book_tags with tags to get tag names
book_tags = book_tags.merge(tags, on='tag_id')
top_tags = book_tags.groupby('goodreads_book_id')['tag_name'] \
                    .apply(lambda x: ', '.join(x.value_counts().head(5).index)) \
                    .reset_index(name='tag_list')

# 3. Join with books
books_subset = books[['book_id', 'goodreads_book_id', 'title', 'authors', 'average_rating', 'ratings_count']]
merged = books_subset.merge(to_read_count, on='book_id', how='left')
merged = merged.merge(top_tags, on='goodreads_book_id', how='left')

# Fill missing to_read_count/tag_list
merged['to_read_count'] = merged['to_read_count'].fillna(0).astype(int)
merged['tag_list'] = merged['tag_list'].fillna('')

# Save result
merged.to_csv("data/goodbooks-10k-master/merged_books.csv", index=False)
