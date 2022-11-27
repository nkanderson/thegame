import React, { useEffect, useState, useReducer } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
} from 'react-router-dom';

import './App.css'
import useSWR from 'swr'

const PHRASES_ENDPOINT = '/.netlify/functions/phrases'
const GAME_ENDPOINT = '/.netlify/functions/games'
const DEBUG = false;
const MAX_PLAYERS = 30;
const MAX_ROUNDS = 4

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

const PhraseList = ({ data }) => {
  return <ul>
    {data.map((item, index) => {
      return <li key={index}>{item.phrase}</li>
    })}
  </ul>
}

const NewGame = () => {
  let navigate = useNavigate();
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
      // Redirect to page for game
      navigate(`/${body.id}`)
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

const PhraseForm = ({ gameID }) => {
  const { data: allPhrases, mutate } = useSWR(gameID ? `${PHRASES_ENDPOINT}/?gameID=${gameID}` : null)
  // local state for phrase form
  const [phrase, setPhrase] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/.netlify/functions/phrases', {
        body: JSON.stringify({ phrase: phrase, round: 1, gameID }),
        method: 'POST'
      })
      const body = await response.json()
      mutate([...allPhrases, body])
      setPhrase("")
      return body
    } catch (e) {
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

const CurrentPhrase = ({ phrase }) => {
  if (!phrase || !phrase.phrase) return null
  return <div><p className="current-phrase">Current phrase: {phrase.phrase}</p></div>
}

const Next = ({ nextPhrase, gameID, currentPhrase, endTurn }) => {
  // onClick should increment currentPhrase round and set a new currentPhrase
  // as a result of incrementing the currentPhrase round; the array of phrases
  // should be updated as well, prior to seleting a new currentPhrase
  const { data: allPhrases, mutate: mutatePhrases } = useSWR(gameID ? `${PHRASES_ENDPOINT}/?gameID=${gameID}` : null)
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

const Start = ({ startTimer }) => {
  return <button onClick={startTimer} className="start-button">Start</button>
}

const Timer = ({ endTimer }) => {
  const SEC = 45
  let [seconds, setSeconds] = useState(SEC)
  let [isActive, setIsActive] = useState(true)

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

const endGame = (navigate, msg) => {
  navigate({
    pathname: `/`,
    state: { msg }
  })
}

// gameStage values are: 'setup', 'ready', and 'playing'
const gameReducer = (state, action) => {
  if (DEBUG) console.log(`dispatched ${action.type} with ${action.payload}`)
  switch (action.type) {
    case 'UPDATE_GAME': {
      // If we're in the ready state, but the game round has updated, our current phrase
      // is no longer valid. It will be updated the next time the latest phrases are retrieved.
      if (action.payload.round !== state.round) {
        return { ...state, round: action.payload.round, phrase: null }
      }

      return { ...state, ...action.payload }
    }
    // TODO: rename this? Once the functionality / purpose of this reducer is settled on,
    // it might go back to ADD_PHRASE, since we're not trying to keep it in sync
    case 'UPDATE_PHRASES': {
      // If we've reached the max number of allowed phrases in our remote data, we're ready to play
      // May also get called when a phrase is updated (e.g. round is incremented)
      if (state.gameStage === 'setup' && action.payload.length >= state.maxPhrases) {
        return { ...state, gameStage: 'ready' }
      }

      // noop if we're still in the setup stage
      return { ...state }
    }
    case 'NEXT_PHRASE': {
      const { allPhrases, game } = { ...action.payload }
      const phrases = phrasesForRound(allPhrases, game.round)
      // When a user's turn ends because we're out of phrases for this round, set the gameStage back to 'ready'
      // TODO: the condition here could instead be if game.round !== state.round, I think...
      if (phrases.length === 0 && state.round < MAX_ROUNDS) {
        return { ...state, ...game, gameStage: 'ready' }
      }
      // If the round isn't done due to being out of phrases, just return a new phrase and keep going
      const currentPhrase = phrases[Math.floor(Math.random() * phrases.length)]
      return { ...state, phrase: currentPhrase }
    }
    case 'START_TURN': {
      // Set a new phrase before allowing the turn to start
      // N.B. there is the possibility that allPhrases or the round will not be updated
      // from remote data when this runs. Eventually, this should be set up such that when
      // a user initiates the start of a turn, we ensure there are no other active turns,
      // other players are locked out of initiating a turn, and we retrieve remote data at that point.
      const allPhrases = action.payload
      const phrases = phrasesForRound(allPhrases, state.round)
      const currentPhrase = phrases[Math.floor(Math.random() * phrases.length)]
      return { ...state, gameStage: 'playing', phrase: currentPhrase }
    }
    // TODO: Similar to PhraseForm, this is throwing a warning re: performing state update
    // on unmounted component.
    case 'END_TURN': {
      return { ...state, gameStage: 'ready' }
    }
    default:
      throw new Error(`Unknown action type: ${action.type}`)
  }
}

const App = () => {
  return <Router>
    <Routes>
      <Route path='/:id' element={<Game />} />
      <Route path='/' element={<Init />} />
    </Routes>
  </Router>
}

const Init = ({ location }) => {
  let optionalMsg = location?.state?.msg ? <p>{location?.state?.msg}</p> : null
  return <main>
    {optionalMsg}
    <NewGame />
  </main>
}

const Game = () => {
  let navigate = useNavigate()
  let { id } = useParams()
  const initialState = {
    gameStage: 'setup',
    id: id,
    round: 1,
    maxPhrases: null,
    phrase: null,
  }
  // Local state updates take place through the gameReducer. Some of the reducer actions
  // are triggered by useEffect with remote data as a dependency. Others are triggered
  // directly through user interactions.
  const [state, dispatch] = useReducer(gameReducer, initialState)
  //
  // remote data: read-only as far as reducer is concerned. Is updated through requests to
  // update the data at endpoints with POST or PUT request, and local changes are
  // forced with `mutate` or through useEffect below
  //
  // Polling is set up so that multiple clients get remote updates, for example, if another client
  // submits the last phrase during setup, or if the game round is incremented.
  // This would probably be better with websockets, but this is ok for a first iteration.
  // Probably the next incremental improvement would be using graphql to get both phrases and the
  // game data in one request.
  const { data: allPhrases } = useSWR(state.id ? `${PHRASES_ENDPOINT}/?gameID=${state.id}` : null, fetchJSON, { refreshInterval: 5000 })
  // Only attempt to fetch the game once we've created one and stored the ID
  const { data: game } = useSWR(state.id ? [GAME_ENDPOINT, state.id] : null, fetchResource, { refreshInterval: 5000 })

  const nextPhrase = (allPhrases, game) => {
    // Redirect to the page for creating a new game if the game is done
    if (game?.round >= MAX_ROUNDS) {
      return endGame(navigate, 'Looks like you won! Play again?')
    }
    dispatch({ type: 'NEXT_PHRASE', payload: { allPhrases, game } })
  }

  // Set current round and max number of phrases once we have our game
  useEffect(() => {
    // Redirect to the page for creating a new game if the requested game is not found or if game is done
    let msg = game?.round >= MAX_ROUNDS ? 'Looks like you won! Play again?' : 'Start a new game'
    if (game?.name === 'NotFound' || game?.round >= MAX_ROUNDS) return endGame(navigate, msg)

    if (game) {
      dispatch({ type: 'UPDATE_GAME', payload: game })
    }
  }, [game, navigate])

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
        // FIXME: getting this index.js:1 Warning: Can't perform a React state update on an unmounted component.
        // This is a no-op, but it indicates a memory leak in your application. To fix, cancel all subscriptions
        // and asynchronous tasks in a useEffect cleanup function. in PhraseForm(at App.js:345) (which was the line for rendering <PhraseForm />)
        state.gameStage === 'setup' &&
        <PhraseForm gameID={state.id} />
      }
      {
        state.gameStage === 'ready' &&
        // TODO: May want to set remote game state as well, to prevent multiple players from taking a turn concurrently.
        // That would probably happen in a side effect function, definitely would not happen in the reducer.
        <Start startTimer={() => { dispatch({ type: 'START_TURN', payload: allPhrases }) }} />
      }
      {
        state.gameStage === 'playing' &&
        <>
          <CurrentPhrase phrase={state.phrase} />
          <Next nextPhrase={nextPhrase} gameID={state.id} currentPhrase={state.phrase} endTurn={() => { dispatch({ type: 'END_TURN' }) }} />
          <Timer endTimer={() => { dispatch({ type: 'END_TURN' }) }} />
        </>
      }
    </main>
  )
}

export default App;
