import pandas as pd
import json


# https://smallworldofwords.org/en/project/research
raw_df = pd.read_csv('strength.SWOW-EN.R1.csv', delimiter='\t')
madan = pd.read_csv('Madan_pRecall_database.csv')
mad = set(madan.word.str.lower())
# %% --------

df = raw_df.sort_values('R1.Strength', ascending=False)
df = df.drop_duplicates('response').dropna()
df = df.loc[df.cue.str.len().between(4,6)]
df = df.loc[df.cue.str.islower() & df.response.str.islower()]
df = df.loc[df.response.isin(mad)]
select = df.iloc[:40]

others = df.iloc[41:].cue
exclude = set(select.cue) | set(select.response)

with open('../static/stimuli/primes.json', 'w+') as f:
    json.dump({
        'primes': dict(zip(select.response, select.cue)),
        'other': list(others.loc[~others.isin(exclude)])
    }, f)

# from nltk.corpus import wordnet as wn
# wn.synsets('dog')[0]