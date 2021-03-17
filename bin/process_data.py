#!/usr/bin/env python3
import pandas as pd
import os
from ast import literal_eval
from fire import Fire
import json
# import nltk
# nltk.download('wordnet')
from nltk.stem.wordnet import WordNetLemmatizer
lemmatize = WordNetLemmatizer().lemmatize

import bonus

def load_words():
    stimuli = json.load(open('static/stimuli/stimuli.json'))
    return {kind: set(map(lemmatize, words)) 
            for kind, words in stimuli['words'].items()}

WORDS = load_words()
ALL_WORDS = set.union(*WORDS.values())

def classify_word(word):
    for k in 'low', 'high':
        if lemmatize(word) in WORDS[k]:
            return k
    raise ValueError('Bad word: ' + word)

def classify_response(word, response):
    if response == '':
        return 'empty'
    possible_intents = set(map(lemmatize, spell.candidates(response)))
    if lemmatize(word) in possible_intents:
        return 'correct'
    elif any(w in possible_intents for w in ALL_WORDS):
        return 'intrusion'
    else:
        return 'other'

from spellchecker import SpellChecker
spell = SpellChecker()
spell.word_frequency.load_words(['bluejay'])  # add any unknown words
for w in ALL_WORDS:
    assert spell.candidates(w) == {w}, w
    assert classify_response(w, w), w

def parse_simple(row):
    ev = literal_eval(row.events)
    t = literal_eval(row.trial)
    x = {'wid': row.wid, 'word': t['word'], 'image': t['image'], 'practice': t.get('practice', False)}
    x['word_type'] = classify_word(x['word'])

    # import IPython, time; IPython.embed(); time.sleep(0.5)
    # import IPython, time; IPython.embed(); time.sleep(0.5)

    for e in ev:
        # if e['event'] == 'start trial':
        if e['event'] == 'show image':
            start = e['time']
        
        elif e['event'] == 'begin response':
            begin_response = e['time']
            x['rt'] = round(begin_response - start)
        
        elif e['event'] == 'type' and 'typing_rt' not in x:
            x['typing_rt'] = round(e['time'] - start)
        
        elif e['event'] == 'response':
            x['response'] = e['response']
            x['type_time'] = e['time'] - begin_response
            x['response_type'] = classify_response(x['word'], e['response'])
            return x
        
        elif e['event'] == 'timeout':
            x['response_type'] = 'timeout'
            return x
    assert False

def parse_multi(row):
    ev = literal_eval(row.events)
    t = literal_eval(row.trial)
    # if row.time_elapsed == 683588:
    #     import IPython, time; IPython.embed(); time.sleep(0.5)
    x = {'wid': row.wid, 'practice': t.get('practice', False)}
    x['fixations'] = fixations = []
    for e in ev:
        # if e['event'] == 'start trial':
        if e['event'] == 'show blocks':
            start = e['time']
            exit_time = start

        elif e['event'] == 'enter':
            enter_time = e['time']
            assert enter_time > exit_time
            fixations.append(('saccade', enter_time - exit_time))

        elif e['event'] == 'exit':
            exit_time = e['time']
            assert enter_time < exit_time
            fixations.append((e['word'], exit_time - enter_time))
        
        elif e['event'] == 'click':
            click_time = e['time']
            x['click_rt'] = round(click_time - start)
            fixations.append((e['word'], click_time - enter_time))

        elif e['event'] == 'type' and 'typing_rt' not in x:
            x['typing_rt'] = round(e['time'] - start)

        elif e['event'] == 'response':
            x['word'] = e['word']
            x['response'] = e['response']
            x['type_time'] = e['time'] - click_time
            x['response_type'] = classify_response(x['word'], e['response'])
            return x

        elif e['event'] == 'timeout':
            print('timeout')
            x['response_type'] = 'timeout'
            return x



def parse_afc(row):
    ev = literal_eval(row.events)
    t = literal_eval(row.trial)
    if abs(row.rt - (ev[1]['time'] - ev[0]['time'])) > 30:
        print('RT discrepancy', row.rt - (ev[1]['time'] - ev[0]['time']))
    assert row.correct == (ev[-1]['response'] == t['target_image'])

    return {
        'wid': row.wid,
        'practice': t.get('practice', False),
        'rt': row.rt,
        'word': t['word'],
        'target': t['target_image'][25:-4],
        'lure': t['lure_images'][0][25:-4],
        'key': ev[-1]['key'],
        'correct': row.correct
    }


def main(codeversion):
    out = f'data/processed/{codeversion}/'
    os.makedirs(out, exist_ok=True)

    def load_raw(kind):
        return  pd.read_csv(f'data/human/{codeversion}/{kind}.csv').dropna(axis=1)

    def process(kind):
        try:
            parser = {'simple-recall': parse_simple, 'multi-recall': parse_multi, 'afc': parse_afc}[kind]
            data = load_raw(kind).apply(parser, axis=1, result_type='expand')
        except FileNotFoundError:
            pass
        else:
            fn = out + f'{kind}.csv'
            data.set_index('wid').to_csv(fn)
            print('wrote', fn)

    for kind in ['simple-recall', 'multi-recall', 'afc']:
        process(kind)

    pdf = load_raw('participants').set_index('wid')
    pdf['math_correct'] = load_raw('math').set_index('wid').num_correct
    pdf.to_csv(out + 'participants.csv')

    survey_raw = load_raw('survey-text').set_index('wid').responses
    survey = pd.DataFrame(list(survey_raw.apply(literal_eval)))
    survey.to_csv(out + 'survey.csv')

    if os.path.isdir('/Users/fred/Projects/memory/data/'):    
        os.system(f'rsync -av data/processed/{codeversion}/ /Users/fred/Projects/memory/data/{codeversion}/')

    bonus.main(codeversion)





if __name__ == '__main__':
    Fire(main)
