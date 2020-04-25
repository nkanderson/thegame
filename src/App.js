import React, { useEffect, useState, useReducer } from 'react'
import './App.css'
import useSWR from 'swr'

const PHRASES_ENDPOINT = '/.netlify/functions/phrases'
const GAME_ENDPOINT = '/.netlify/functions/games'
const DEBUG = false;
const MAX_PLAYERS = 30;

async function fetchJSON(...args) {
  const res = await fetch(...args)
  return res.json()
}

async function fetchResource(endpoint, id) {
  const data = await fetchJSON(`${endpoint}/${id}`)
  return data
}

// TODO: maybe useMemo()
const phrasesForRound = (phrases, round) => {
  return phrases.filter(phrase => phrase.round === round)
}

const PhraseList = ({data}) => {
  return <ul>
    {data.map((item, index) => {
      return <li key={index}>{item.phrase}</li>
    })}
  </ul>
}

const NewGame = ({initGame}) => {
  // local state for new game form
  const [numPlayers, setNumPlayers] = useState(1);

  const createGame = async (e) => {
    e.preventDefault()
    const maxPhrases = numPlayers * 3;
    const response = await fetch('/.netlify/functions/games', {
      body: JSON.stringify({ round: 1, maxPhrases: maxPhrases }),
      method: 'POST'
    })
    const body = await response.json()
    // Could implement or call a resetGame here that would delete existing game & phrases

    if (response.ok) {
      initGame(body)
    } else {
      console.error('Failed to create a game')
    }
  }

  return (
    <form onSubmit={createGame}>
      <label>
        How many players?
      <input
          className="num-players"
          type="number"
          value={numPlayers}
          min={1}
          onChange={e => {
            if (e.target.value > MAX_PLAYERS) {
              alert(`Too many players! The max is ${MAX_PLAYERS}`)
              return
            }
            setNumPlayers(e.target.value)
          }}
        />
      </label>
      <input className="new-game-button" type="submit" value="New Game" />
    </form>
  )
}

const PhraseForm = () => {
  const { data: allPhrases, mutate } = useSWR(PHRASES_ENDPOINT)
  // local state for phrase form
  const [ phrase, setPhrase ] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/.netlify/functions/phrases', {
        body: JSON.stringify({ phrase: phrase, round: 1 }),
        method: 'POST'
      })
      const body = await response.json()
      mutate([ ...allPhrases, body ])
      setPhrase("")
      return body
    } catch(e) {
      console.error(e)
    }
  }

  return <form onSubmit={handleSubmit}>
    <label>
      Enter Phrase:
      <input
        type="text"
        value={phrase}
        onChange={e => setPhrase(e.target.value)}
      />
    </label>
    <input className="input-submit" type="submit" value="Submit" />
  </form>
}

const CurrentPhrase = ({phrase}) => {
  if (!phrase || !phrase.phrase) return null
  return <div><p className="current-phrase">Current phrase: {phrase.phrase}</p></div>
}

const Next = ({nextPhrase, gameID, currentPhrase, endTurn}) => {
  // onClick should increment currentPhrase round and set a new currentPhrase
  // as a result of incrementing the currentPhrase round, the array of phrases
  // should be updated as well, prior to seleting a new currentPhrase
  const { data: allPhrases, mutate: mutatePhrases } = useSWR(PHRASES_ENDPOINT)
  const { data: game, mutate: mutateGame } = useSWR([GAME_ENDPOINT, gameID], fetchResource)

  const setNext = async (e) => {
    e.preventDefault()
    let { phrase, round, id } = currentPhrase
    // We'll pass any remote state that's been updated to the nextPhrase handler so that
    // it's available in the reducer
    let updatedGame = game
    let updatedPhrases = null

    try {
      const response = await fetch(`/.netlify/functions/phrases/${id}`, {
        body: JSON.stringify({ phrase: phrase, round: round + 1 }),
        method: 'PUT'
      })
      const body = await response.json()
      // Find the updated phrase in allPhrases and replace it
      let updatedPhraseIndex = allPhrases.findIndex((phrase) => phrase && phrase.id === id)
      const existingPhrases = [...allPhrases.slice(0, updatedPhraseIndex), ...allPhrases.slice(updatedPhraseIndex + 1)]
      // TODO: Maybe remove this mutate. Its primary result will be to trigger the
      // UPDATE_PHRASES reducer, which at this point, should be a noop. The nextPhrase
      // handler below will take care of the updates via the reducer we actually want to
      // call here.
      mutatePhrases([...existingPhrases, body])
      updatedPhrases = [...existingPhrases, body]
      let phrases = phrasesForRound(updatedPhrases, game.round)

      // If there are no more phrases for this round, we need to update the game round
      if (phrases.length === 0) {
        // Update game via games endpoint, then update locally with mutate
        try {
          // let gameId = game.id
          console.log('updating game id:', gameID)
          // TODO: I suppose I could implement a PATCH handler in the API so I wouldn't
          // need to pass in maxPhrases again
          const response = await fetch(`/.netlify/functions/games/${gameID}`, {
            body: JSON.stringify({ maxPhrases: game.maxPhrases, round: game.round + 1 }),
            method: 'PUT'
          })
          const body = await response.json()
          // TODO: As with the above, we can maybe remove this mutate. Its primary result
          // will be to trigger the UPDATE_GAME reducer, which at this point, should be a noop.
          // The nextPhrase handler below will take care of the updates via the reducer we
          // actually want to call here.
          mutateGame(body)
          updatedGame = body
          endTurn()
        } catch (e) {
          console.error(e)
        }
      }
    } catch (e) {
      console.error(e)
    }
    nextPhrase(updatedPhrases, updatedGame)
  }

  return <button onClick={setNext} className="next-button">Next</button>
}

const Start = ({startTimer}) => {
  return <button onClick={startTimer} className="start-button">Start</button>
}

const Timer = ({endTimer}) => {
  const SEC = 10
  let [ seconds, setSeconds ] = useState(SEC)
  let [ isActive, setIsActive ] = useState(true)

  const reset = () => {
    setSeconds(SEC)
    setIsActive(false)
  }

  useEffect(() => {
    let interval = null
    if (seconds > 0 && isActive) {
      interval = setInterval(() => {
        setSeconds(seconds => seconds - 1)
      }, 1000)
    } else if (seconds === 0 && isActive) {
      endTimer()
      reset()
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [seconds, isActive, endTimer])

  return <p>Seconds: {seconds}</p>
}

const initialState = {
  gameStage: 'init',
  id: null,
  round: 1,
  maxPhrases: null,
  phrase: null,
}

const gameReducer = (state, action) => {
  if (DEBUG) console.log(`dispatched ${action.type} with ${action.payload}`)
  switch (action.type) {
    case 'UPDATE_GAME':
      // { gameStage: 'setup', round: 1, maxPhrases: (action.payload.numPlayers * 3), phrase: null, phrases: null }
      // eventually would store the game ID in state
      // const { id, maxPhrases, round } = { game }
      // return {...state, gameStage: 'setup', gameID: action.payload.gameID }
      // If we're updating from the 'init' stage, we're ready to go into setup
      if (state.gameStage === 'init') {
        return { ...state, gameStage: 'setup', ...action.payload }
      }

      // If we've updated the round, we should set a new current phrase as well
      // if (action.payload.round > state.round) {
      //   // ...except that we don't have access to allPhrases :(
      // }
      // Otherwise we're just updating game
      return { ...state, ...action.payload }
    // TODO: rename this? Once the functionality / purpose of this reducer is settled on,
    // it might go back to ADD_PHRASE, since we're not trying to keep it in sync
    case 'UPDATE_PHRASES':
      // If we've reached the max number of allowed phrases in our remote data, we're ready to play
      // May also get called when a phrase is updated (e.g. round is incremented)
      if (state.gameStage === 'setup' && action.payload.length >= state.maxPhrases) {
        const phrases = phrasesForRound(action.payload, state.round)
        if (phrases.length > 0) {
          const currentPhrase = phrases[Math.floor(Math.random() * phrases.length)]
          return { ...state, gameStage: 'ready', phrase: currentPhrase }
        }
      }
      // noop if we're not ready to set the current phrase yet
      return { ...state }
    case 'NEXT_PHRASE':
      const { allPhrases, game } = { ...action.payload }
      const phrases = phrasesForRound(allPhrases, game.round)
      // When a user's turn ends because we're out of phrases for this round,
      // set the gameStage back to 'ready'
      // Also set a new phrase from the next round. This could also be done
      // instead in START_TURN, and we could set phrase to null here.
      // TODO: the condition here could instead be if game.round !== state.round, I think...
      if (phrases.length === 0 && state.round < 4) {
        const nextPhrases = phrasesForRound(allPhrases, game.round + 1)
        const currentPhrase = nextPhrases[Math.floor(Math.random() * nextPhrases.length)]
        return { ...state, ...game, phrase: currentPhrase, gameStage: 'ready' }
      } else if (state.round >= 4) {
        return { ...state, gameStage: 'done' }
      }
      // If the round isn't done due to being out of phrases, just return a new
      // phrase and keep going
      const currentPhrase = phrases[Math.floor(Math.random() * phrases.length)]
      return { ...state, phrase: currentPhrase }
    case 'START_TURN':
      // TODO: we should set a new phrase here so the last one from the previous
      // player's turn isn't by default the first one the next person starts with
      return { ...state, gameStage: 'playing' }
    case 'END_TURN':
      // TODO: Check if the game is done or won, in which case the gameStage could be updated
      return { ...state, gameStage: 'ready' }
    default:
      throw new Error(`Unknown action type: ${action.type}`)
  }
}

const App = () => {
  // TODO: eventually should use destructuring assignment for state, and
  // remove useState from above
  // Local state updates take place through the gameReducer. Some of the reducer actions
  // are triggered by useEffect with remote data as a dependency. Others are triggered
  // directly through user interactions.
  const [state, dispatch] = useReducer(gameReducer, initialState)
  //
  // remote data: read-only as far as reducer is concerned. Is updated through requests to
  // update the data at endpoints with POST or PUT request, and local changes are
  // forced with `mutate` or through useEffect below
  //
  // TODO: Our phrases fetch will eventually need to pass the game ID to filter by
  const { data: allPhrases } = useSWR(PHRASES_ENDPOINT, fetchJSON)
  // Only attempt to fetch the game once we've created one and stored the ID
  const { data: game } = useSWR(state.id ? [GAME_ENDPOINT, state.id] : null, fetchResource)

  const initGame = (game) => {
    dispatch({ type: 'UPDATE_GAME', payload: game })
  }

  const nextPhrase = (allPhrases, game) => {
    dispatch({ type: 'NEXT_PHRASE', payload: { allPhrases, game } })
  }

  // Set current round and max number of phrases once we have our game
  useEffect(() => {
    if (game) {
      dispatch({ type: 'UPDATE_GAME', payload: game })
    }
  }, [game])

  useEffect(() => {
    if (allPhrases && allPhrases.length > 0) {
      dispatch({ type: 'UPDATE_PHRASES', payload: allPhrases })
    }
  }, [allPhrases])

  if (DEBUG) console.log('current state:', state)

  return (
    <main>
      {DEBUG && allPhrases && <PhraseList data={allPhrases} />}

      {
        state.gameStage === 'done' &&
        <p>Looks like you won! Play again?</p>
      }
      {
        // TODO: Based on gameStage instead?
        // state.gameStage === 'init' &&
        (!state.id || state.gameStage === 'done') &&
        <NewGame initGame={initGame} />
      }
      {
        // FIXME: getting this index.js:1 Warning: Can't perform a React state update on an unmounted component.
        // This is a no-op, but it indicates a memory leak in your application. To fix, cancel all subscriptions
        // and asynchronous tasks in a useEffect cleanup function. in PhraseForm(at App.js:345) (which was the line for rendering <PhraseForm />)
        state.gameStage === 'setup' &&
        <PhraseForm />
      }
      {
        state.gameStage === 'ready' &&
        <Start startTimer={() => {dispatch({ type: 'START_TURN' })}} />
      }
      {
        state.gameStage === 'playing' &&
        <CurrentPhrase phrase={state.phrase} />
      }
      {
        state.gameStage === 'playing' &&
        <Next nextPhrase={nextPhrase} gameID={state.id} currentPhrase={state.phrase} endTurn={() => {dispatch({ type: 'END_TURN' })}} />
      }
      {
        state.gameStage === 'playing' &&
        <Timer endTimer={() => {dispatch({ type: 'END_TURN' })}} />
      }
    </main>
  )
}

export default App;
