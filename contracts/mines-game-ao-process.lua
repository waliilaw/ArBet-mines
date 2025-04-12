-- AO Process for Mines Game Randomness
-- This process handles random number generation for the mines game
Name = "ArBet"
Owner = "Z_DbM70oALkWPMmktJiikV1uJcTvBXyKgFTdN3sqnW0"
-- State initialization
if not Handlers.utils then
  Handlers.utils = {}
end

if not Handlers.games then
  Handlers.games = {}
end

-- Utils functions
Handlers.utils.hash = function(data)
  return ao.sha256(data)
end

Handlers.utils.generateSeed = function()
  local timestamp = os.time()
  local nonce = math.random(1, 10000000)
  local processId = ao.id
  local blockHeight = ao.block.height
  local seedStr = tostring(timestamp) .. tostring(nonce) .. processId .. tostring(blockHeight)
  return Handlers.utils.hash(seedStr)
end

Handlers.utils.randomInRange = function(seed, min, max, index)
  local hashInput = seed .. tostring(index)
  local hash = Handlers.utils.hash(hashInput)
  
  -- Convert first 4 bytes of hash to a number
  local num = 0
  for i = 1, 4 do
    num = num * 256 + string.byte(hash, i, i)
  end
  
  -- Scale to range
  local range = max - min + 1
  local result = min + (num % range)
  return result
end

-- Generate unique random numbers
Handlers.utils.generateUniqueRandomNumbers = function(count, max, seed)
  local seed = seed or Handlers.utils.generateSeed()
  local result = {}
  local used = {}
  
  local attempts = 0
  local maxAttempts = max * 2
  
  while #result < count and attempts < maxAttempts do
    attempts = attempts + 1
    local num = Handlers.utils.randomInRange(seed, 0, max - 1, attempts)
    
    if not used[num] then
      table.insert(result, num)
      used[num] = true
    end
  end
  
  -- If we couldn't generate enough unique numbers, return what we have
  return result
end

-- Handler for GetRandomness action
Handlers.getRandomness = function(msg)
  if msg.Tags.Action ~= "GetRandomness" then return end
  
  local range = tonumber(msg.Tags.Range) or 25
  local count = tonumber(msg.Tags.Count) or 5
  
  -- Validate input
  if count < 1 or count >= range then
    return ao.send({
      Target = msg.From,
      Data = json.encode({
        success = false,
        error = "Invalid range or count parameters"
      })
    })
  end
  
  -- Generate a seed based on current block and message info
  local seed = Handlers.utils.generateSeed()
  
  -- Generate unique random positions for mines
  local positions = Handlers.utils.generateUniqueRandomNumbers(count, range, seed)
  
  -- Store the game result in state for verification
  local gameId = msg.Tags.GameId or tostring(os.time()) .. "_" .. tostring(math.random(1000000))
  
  Handlers.games[gameId] = {
    positions = positions,
    timestamp = os.time(),
    range = range,
    count = count,
    from = msg.From
  }
  
  -- Send the positions back to the sender
  ao.send({
    Target = msg.From,
    Data = json.encode({
      success = true,
      gameId = gameId,
      positions = positions
    })
  })
end

-- Handler for verifying game results
Handlers.verifyGameResult = function(msg)
  if msg.Tags.Action ~= "VerifyGameResult" then return end
  
  local gameId = msg.Tags.GameId
  
  -- Check if we have the game in state
  if not Handlers.games[gameId] then
    return ao.send({
      Target = msg.From,
      Data = json.encode({
        success = false,
        error = "Game not found"
      })
    })
  end
  
  local game = Handlers.games[gameId]
  
  -- Parse the message data to get revealed positions
  local data = json.decode(msg.Data)
  local revealedPositions = data.revealedPositions or {}
  
  -- Check if any revealed position contains a mine
  local isValid = true
  for _, revealedPos in ipairs(revealedPositions) do
    for _, minePos in ipairs(game.positions) do
      if revealedPos == minePos then
        isValid = false
        break
      end
    end
    if not isValid then
      break
    end
  end
  
  -- Send verification result
  ao.send({
    Target = msg.From,
    Data = json.encode({
      success = true,
      gameId = gameId,
      isValid = isValid
    })
  })
end

-- Register message handlers
Handlers.add("getRandomness", Handlers.getRandomness)
Handlers.add("verifyGameResult", Handlers.verifyGameResult)

-- Process initialization message
function handle(msg)
  -- Log the incoming message
  ao.log("Received message: " .. json.encode(msg))
  
  -- Handle different message types
  if msg.Tags.Action == "GetRandomness" then
    Handlers.getRandomness(msg)
  elseif msg.Tags.Action == "VerifyGameResult" then
    Handlers.verifyGameResult(msg)
  else
    -- Unknown action
    ao.send({
      Target = msg.From,
      Data = json.encode({
        success = false,
        error = "Unknown action"
      })
    })
  end
end 