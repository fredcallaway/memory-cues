#!/usr/bin/env python3
import pandas as pd
import os
from ast import literal_eval
from fire import Fire
import json
from spellchecker import SpellChecker

# from nltk.stem.wordnet import WordNetLemmatizer
# lemmatize = WordNetLemmatizer().lemmatize
def normalize(word):
    return word.strip().lower()

import bonus

# def load_words():
#     stimuli = json.load(open('static/stimuli/stimuli.json'))
#     return {kind: set(map(lemmatize, words)) 
#             for kind, words in stimuli['words'].items()}
# this gets called in main

CLASSIFIERS = None
SPELL_CHECK = SpellChecker()

def build_classifiers(pdf):
    
    def build(pairs):
        if pd.isna(pairs):
            return None
        words = set(x['word'] for x in literal_eval(pairs))

        # that's right, three layers of nested functions
        def classify(word, response):
            response = normalize(response)
            word = normalize(word)
            if word == response:
                return 'correct'
            if len(response) <= 1:
                return 'empty'

            possible_intents = SPELL_CHECK.candidates(response)
            if word in possible_intents:
                return 'correct'
            elif any(w in words for w in possible_intents):
                return 'intrusion'
            else:
                return 'other'

        return classify
    
    global CLASSIFIERS
    CLASSIFIERS = pdf.pairs.apply(build)

def classify_response(word, response, wid):
    return CLASSIFIERS[wid](word, response)

def parse_simple(row):
    ev = literal_eval(row.events)
    t = literal_eval(row.trial)
    x = {
        'wid': row.wid,
        'word': t['word'],
        'image': t['image'],
        'practice': t.get('practice', False),
        'block': int(getattr(row, 'block', 0))
    }
    begin_type = float('nan')
    # x['word_type'] = classify_word(x['word'])

    for e in ev:
        # if e['event'] == 'start trial':
        if e['event'] == 'show image':
            start = e['time']
                
        elif e['event'] == 'type' and 'typing_rt' not in x:
            if (e['time'] - start) < 30:
                continue  # this is probably a mispress
            begin_type = e['time']
            x['typing_rt'] = begin_type - start

        elif e['event'] == 'judgement':
            x['judgement_type'] = e['type']
            x['judgement'] = int(e['key'])
        
        elif e['event'] == 'response':
            x['response'] = e['response']
            x['type_time'] = e['time'] - begin_type
            x['rt'] = e['time'] - start
            x['response_type'] = classify_response(x['word'], e['response'], row.wid)
        
        elif e['event'] == 'timeout':
            x['response_type'] = 'timeout'
    return x

def parse_multi_flip(row):
    ev = literal_eval(row.events)
    t = literal_eval(row.trial)
    x = {
        'wid': row.wid,
        'practice': t.get('practice', False),
        'first_word': t['options'][0]['word'],
        'second_word': t['options'][1]['word'],
        'presentation_times': []
    }

    for e in ev:
        if e['event'] == 'show':
            start = e['time']
            begin_fix = e['time']

        elif e['event'] == 'switch':
            x['presentation_times'].append(e['time'] - begin_fix)
            begin_fix = e['time']

        elif e['event'] == 'begin response':
            x['presentation_times'].append(e['time'] - begin_fix)

        elif e['event'] == 'type' and 'typing_rt' not in x:
            x['typing_rt'] = round(e['time'] - start)

        elif e['event'] == 'response':
            x['word'] = e['word']
            x['response'] = e['response']
            x['response_rt'] = e['time'] - start
            x['response_type'] = classify_response(x['word'], e['response'], row.wid)
            return x

        elif e['event'] == 'timeout':
            x['response_type'] = 'timeout'
            x['presentation_times'].append(e['time'] - begin_fix)
            return x

def parse_multi(row):
    ev = literal_eval(row.events)
    t = literal_eval(row.trial)
    x = {
        'wid': row.wid,
        'practice': t.get('practice', False),
    }
    left, right = 0, 1
    left_word = t['options'][left]['word']
    right_word = t['options'][right]['word']

    x['presentation_times'] = []
    start = float('nan')
    shown = None
    begin_fix = None
    for e in ev:
        if e['event'] == 'show prime':
            x['primed_word'] = e['primed']
        if e['event'] == 'show':
            if e['option'] == shown:  # showing the already on screen option, ignore this
                continue
            if shown is None:  # first presentation
                if e['option'] == left:
                    x['first_seen'] = 'left'
                    x['first_word'] = left_word
                    x['second_word'] = right_word
                else:
                    x['first_seen'] = 'right'
                    x['first_word'] = right_word
                    x['second_word'] = left_word
                start = e['time']
            else:  # non-first
                x['presentation_times'].append(e['time'] - begin_fix)
            begin_fix = e['time']
            shown = e['option']

        elif e['event'] == 'choose':
            x['choice'] = ['left', 'right'][e['option']]
            x['choice_rt'] = e['time'] - start
            if begin_fix is not None:
                x['presentation_times'].append(e['time'] - begin_fix)

        elif e['event'] == 'type' and 'typing_rt' not in x:
            x['typing_rt'] = e['time'] - start

        elif e['event'] == 'response':
            x['word'] = e['word']
            x['response'] = e['response']
            x['response_rt'] = e['time'] - start
            x['response_type'] = classify_response(x['word'], e['response'], row.wid)

            return x

        elif e['event'] == 'timeout':
            x['response_type'] = 'timeout'
            if 'choice' not in x:
                x['presentation_times'].append(e['time'] - begin_fix)
            return x

def parse_afc(row):
    ev = literal_eval(row.events)
    t = literal_eval(row.trial)
    if abs(row.rt - (ev[1]['time'] - ev[0]['time'])) > 30:
        print('RT discrepancy', row.rt - (ev[1]['time'] - ev[0]['time']))
    assert row.correct == (ev[-1]['response'] == t['target_image'])

    return {
        'wid': row.wid,
        'block': int(getattr(row, 'block', 0)),
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
        return  pd.read_csv(f'data/human/{codeversion}/{kind}.csv')#.dropna(axis=1)

    pdf = load_raw('participants').set_index('wid')
    pdf['math_correct'] = load_raw('math').set_index('wid').num_correct
    build_classifiers(pdf)

    for kind in ['simple-recall', 'multi-recall', 'afc', 'simple-recall-penalized']:
        try:
            parser = {'simple-recall': parse_simple, 'multi-recall': parse_multi, 
                'afc': parse_afc, 'simple-recall-penalized': parse_simple}[kind]
            data = load_raw(kind).apply(parser, axis=1, result_type='expand')
            if kind == 'afc' and codeversion == 'v3.4':
                data['block'] = ([1] * 40 + [2] * 80) * len(data.wid.unique())   
        except FileNotFoundError:
            pass
        else:
            fn = out + f'{kind}.csv'
            data.set_index('wid').to_csv(fn)
            print('wrote', fn)


    n_incomplete = (pdf.completed != True).sum()
    print(f'{n_incomplete} participants did not complete the experiment')
    pdf = pdf.loc[pdf.completed == True]
    pdf.to_csv(out + 'participants.csv')

    survey_raw = load_raw('survey-text').set_index('wid').responses
    survey = pd.DataFrame(list(survey_raw.apply(literal_eval)), index=survey_raw.index)
    survey.to_csv(out + 'survey.csv')

    if os.path.isdir('/Users/fred/Projects/memory/data/full/'):
        os.system(f'rsync -av data/processed/{codeversion}/ /Users/fred/Projects/memory/data/full/{codeversion}/')
        print(f'wrote /Users/fred/Projects/memory/data/full/{codeversion}/')

    bonus.main(codeversion)

if __name__ == '__main__':
    Fire(main)
