#!/usr/bin/env python3
import pandas as pd
import os
from ast import literal_eval
from fire import Fire

def read_word_list(kind):
    with open(f'word_stimuli/{kind}_mem_words.txt') as f:
        return f.read().strip().split('\n')

WORDS = {kind: set(read_word_list(kind)) for kind in ['high', 'low']}
ALL_WORDS = set.union(*WORDS.values())

def classify_word(word):
    for k in 'low', 'high':
        if word in WORDS[k]:
            return k
    raise ValueError('Bad word: ' + word)

def classify_response(word, response):
    if word == response:
        return 'correct'
    elif word in ALL_WORDS:
        return 'intrusion'
    else:
        return 'other'

def parse_trial(row):
    ev = literal_eval(row.events)
    x = {'wid': row.wid}
    for e in ev:
        if e['event'] == 'show image':
            start = e['time']
        elif e['event'] == 'begin response':
            begin_response = e['time']
            x['rt'] = round(begin_response - start)
        elif e['event'] == 'response':
            x['word'] = e['word']
            x['word_type'] = classify_word(e['word'])
            x['response_type'] = classify_response(e['word'], e['response'])
            x['response'] = e['response']
            x['type_time'] = e['time'] - begin_response

    return x

def main(codeversion):
    out = f'data/processed/{codeversion}/'
    
    def load_raw(kind):
        return  pd.read_csv(f'data/human/{codeversion}/{kind}.csv').dropna(axis=1)

    trials = load_raw('simple-recall').apply(parse_trial, axis=1, result_type='expand')
    trials.set_index('wid').to_csv(out + 'trials.csv')

    pdf = load_raw('participants').set_index('wid')
    pdf['math_correct'] = load_raw('math').set_index('wid').num_correct
    pdf.to_csv(out + 'participants.csv')

    survey_raw = load_raw('survey-text').set_index('wid').responses
    survey = pd.DataFrame(list(survey_raw.apply(literal_eval)))
    survey.to_csv(out + 'survey.csv')


if __name__ == '__main__':
    Fire(main)
