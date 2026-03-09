use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hashv;
use anchor_lang::solana_program::program_pack::Pack;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("4J8koywfHEzdv7o2DLE1xajsLsBG1BbQp1RxuJqNf7m4");

const TEAM_COUNT: usize = 2;
const MAX_PLAYERS: usize = 6;
const MAX_UNIT_KINDS: usize = 4;
const MAX_TOWER_KINDS: usize = 4;
const MAX_UNITS: usize = 32;
const MAX_TOWERS: usize = 16;
const MAX_ACTIONS: usize = 128;
const FORTRESS_POSITION_START: u16 = 0;
const FORTRESS_POSITION_END: u16 = 100;
const CHECKPOINT_INTERVAL: u64 = 5;
const TEAM_UNSET: u8 = 255;
const PHASE_LOBBY: u8 = 0;
const PHASE_LIVE: u8 = 1;
const PHASE_FINISHED: u8 = 2;
const ACTION_MATCH_CREATED: u8 = 0;
const ACTION_PLAYER_JOINED: u8 = 1;
const ACTION_MATCH_STARTED: u8 = 2;
const ACTION_UNIT_DEPLOYED: u8 = 3;
const ACTION_TOWER_BUILT: u8 = 4;
const ACTION_TICK_ADVANCED: u8 = 5;
const ACTION_UNIT_KILLED: u8 = 6;
const ACTION_TOWER_DESTROYED: u8 = 7;
const ACTION_FORTRESS_HIT: u8 = 8;
const ACTION_MATCH_SETTLED: u8 = 9;
const ACTION_CHECKPOINT_WRITTEN: u8 = 10;

#[program]
pub mod fortress_wars {
    use super::*;

    pub fn initialize_game_config(
        ctx: Context<InitializeGameConfig>,
        args: InitializeGameConfigArgs,
    ) -> Result<()> {
        require!(args.unit_kinds.len() <= MAX_UNIT_KINDS, FortressError::TooManyDefinitions);
        require!(args.tower_kinds.len() <= MAX_TOWER_KINDS, FortressError::TooManyDefinitions);
        require!(args.lane_count > 0, FortressError::InvalidLane);
        require!(args.max_players_per_team > 0, FortressError::InvalidPlayerCount);

        let config = &mut ctx.accounts.game_config;
        config.authority = ctx.accounts.authority.key();
        config.token_mint = ctx.accounts.token_mint.key();
        config.treasury = ctx.accounts.treasury.key();
        config.bump = ctx.bumps.game_config;
        config.version = args.version;
        config.lane_count = args.lane_count;
        config.max_players_per_team = args.max_players_per_team;
        config.reward_model = args.reward_model;
        config.fortress_health = args.fortress_health;
        config.next_match_id = 0;
        config.unit_kinds = args.unit_kinds;
        config.tower_kinds = args.tower_kinds;
        Ok(())
    }

    pub fn create_match(
        ctx: Context<CreateMatch>,
        args: CreateMatchArgs,
    ) -> Result<()> {
        let config = &mut ctx.accounts.game_config;
        require_keys_eq!(ctx.accounts.creator_token_account.mint, config.token_mint, FortressError::InvalidTokenMint);

        let match_account = &mut ctx.accounts.match_account;
        match_account.bump = ctx.bumps.match_account;
        match_account.match_id = config.next_match_id;
        match_account.config = config.key();
        match_account.creator = ctx.accounts.creator.key();
        match_account.phase = PHASE_LOBBY;
        match_account.lane_count = config.lane_count;
        match_account.current_tick = 0;
        match_account.action_sequence = 0;
        match_account.checkpoint_count = 0;
        match_account.winner_team = TEAM_UNSET;
        match_account.settled = false;
        match_account.team_player_counts = [0; TEAM_COUNT];
        match_account.players = [Pubkey::default(); MAX_PLAYERS];
        match_account.player_teams = [TEAM_UNSET; MAX_PLAYERS];
        match_account.fortress_hp = [config.fortress_health; TEAM_COUNT];
        match_account.next_unit_id = 0;
        match_account.next_tower_id = 0;
        match_account.units = Vec::new();
        match_account.towers = Vec::new();
        match_account.reward_pool_seeded = args.initial_reward_pool;

        let action_log = &mut ctx.accounts.action_log;
        action_log.match_account = match_account.key();
        action_log.records = Vec::new();

        let checkpoint = &mut ctx.accounts.checkpoint;
        checkpoint.match_account = match_account.key();
        checkpoint.total_checkpoints = 0;
        checkpoint.last_tick = 0;
        checkpoint.last_hash = [0; 32];

        if args.initial_reward_pool > 0 {
            transfer_tokens(
                &ctx.accounts.token_program,
                &ctx.accounts.creator_token_account,
                &ctx.accounts.reward_vault,
                &ctx.accounts.creator,
                args.initial_reward_pool,
                None,
            )?;
        }

        append_action(
            match_account,
            action_log,
            ctx.accounts.creator.key(),
            TEAM_UNSET,
            ACTION_MATCH_CREATED,
            0,
            0,
            args.initial_reward_pool,
        )?;

        config.next_match_id = config.next_match_id.checked_add(1).ok_or(FortressError::MathOverflow)?;
        Ok(())
    }

    pub fn join_match(ctx: Context<JoinMatch>, team: u8) -> Result<()> {
        require!(team < TEAM_COUNT as u8, FortressError::InvalidTeam);
        let config = &ctx.accounts.game_config;
        let match_account = &mut ctx.accounts.match_account;
        require!(match_account.phase == PHASE_LOBBY, FortressError::MatchAlreadyStarted);
        require!(match_account.team_player_counts[team as usize] < config.max_players_per_team, FortressError::TeamFull);
        require!(!player_is_registered(match_account, &ctx.accounts.player.key()), FortressError::PlayerAlreadyJoined);

        let slot = first_open_player_slot(match_account).ok_or(FortressError::RosterFull)?;
        match_account.players[slot] = ctx.accounts.player.key();
        match_account.player_teams[slot] = team;
        match_account.team_player_counts[team as usize] += 1;

        let player_state = &mut ctx.accounts.player_state;
        player_state.bump = ctx.bumps.player_state;
        player_state.match_account = match_account.key();
        player_state.player = ctx.accounts.player.key();
        player_state.team = team;
        player_state.total_spent = 0;
        player_state.total_rewarded = 0;
        player_state.joined = true;

        append_action(
            match_account,
            &mut ctx.accounts.action_log,
            ctx.accounts.player.key(),
            team,
            ACTION_PLAYER_JOINED,
            team as u16,
            slot as u16,
            0,
        )?;
        Ok(())
    }

    pub fn start_match(ctx: Context<StartMatch>) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        require!(match_account.phase == PHASE_LOBBY, FortressError::InvalidPhase);
        require!(match_account.team_player_counts[0] > 0 && match_account.team_player_counts[1] > 0, FortressError::TeamsNotReady);
        match_account.phase = PHASE_LIVE;
        append_action(
            match_account,
            &mut ctx.accounts.action_log,
            ctx.accounts.authority.key(),
            TEAM_UNSET,
            ACTION_MATCH_STARTED,
            0,
            0,
            0,
        )?;
        write_checkpoint(match_account, &mut ctx.accounts.checkpoint, &mut ctx.accounts.action_log)?;
        Ok(())
    }

    pub fn deploy_unit(ctx: Context<DeployUnit>, unit_kind: u8, lane: u8) -> Result<()> {
        let config = &ctx.accounts.game_config;
        let match_account = &mut ctx.accounts.match_account;
        let player_state = &mut ctx.accounts.player_state;
        require!(match_account.phase == PHASE_LIVE, FortressError::InvalidPhase);
        require!(lane < match_account.lane_count, FortressError::InvalidLane);
        require!(player_state.joined, FortressError::UnauthorizedPlayer);
        require!(player_state.match_account == match_account.key(), FortressError::WrongMatch);
        require!(match_account.units.len() < MAX_UNITS, FortressError::EntityCapacityReached);

        let definition = config.unit_kinds.iter().find(|kind| kind.id == unit_kind).ok_or(FortressError::UnknownUnitKind)?;
        transfer_tokens(
            &ctx.accounts.token_program,
            &ctx.accounts.player_token_account,
            &ctx.accounts.match_vault,
            &ctx.accounts.player,
            definition.cost,
            None,
        )?;

        let position = if player_state.team == 0 { FORTRESS_POSITION_START } else { FORTRESS_POSITION_END };
        let next_unit_id = match_account.next_unit_id;
        match_account.units.push(UnitInstance {
            id: next_unit_id,
            owner: ctx.accounts.player.key(),
            team: player_state.team,
            lane,
            kind: unit_kind,
            position,
            hp: definition.health,
            cooldown: 0,
            alive: true,
        });
        match_account.next_unit_id = match_account.next_unit_id.checked_add(1).ok_or(FortressError::MathOverflow)?;
        player_state.total_spent = player_state.total_spent.checked_add(definition.cost).ok_or(FortressError::MathOverflow)?;

        append_action(
            match_account,
            &mut ctx.accounts.action_log,
            ctx.accounts.player.key(),
            player_state.team,
            ACTION_UNIT_DEPLOYED,
            lane as u16,
            unit_kind as u16,
            definition.cost,
        )?;
        Ok(())
    }

    pub fn build_tower(ctx: Context<BuildTower>, tower_kind: u8, lane: u8, slot: u8) -> Result<()> {
        let config = &ctx.accounts.game_config;
        let match_account = &mut ctx.accounts.match_account;
        let player_state = &mut ctx.accounts.player_state;
        require!(match_account.phase == PHASE_LIVE, FortressError::InvalidPhase);
        require!(lane < match_account.lane_count, FortressError::InvalidLane);
        require!(match_account.towers.len() < MAX_TOWERS, FortressError::EntityCapacityReached);
        require!(!tower_slot_occupied(match_account, player_state.team, lane, slot), FortressError::TowerSlotOccupied);

        let definition = config.tower_kinds.iter().find(|kind| kind.id == tower_kind).ok_or(FortressError::UnknownTowerKind)?;
        transfer_tokens(
            &ctx.accounts.token_program,
            &ctx.accounts.player_token_account,
            &ctx.accounts.match_vault,
            &ctx.accounts.player,
            definition.cost,
            None,
        )?;

        let next_tower_id = match_account.next_tower_id;
        match_account.towers.push(TowerInstance {
            id: next_tower_id,
            owner: ctx.accounts.player.key(),
            team: player_state.team,
            lane,
            slot,
            kind: tower_kind,
            hp: definition.health,
            cooldown: 0,
            alive: true,
        });
        match_account.next_tower_id = match_account.next_tower_id.checked_add(1).ok_or(FortressError::MathOverflow)?;
        player_state.total_spent = player_state.total_spent.checked_add(definition.cost).ok_or(FortressError::MathOverflow)?;

        append_action(
            match_account,
            &mut ctx.accounts.action_log,
            ctx.accounts.player.key(),
            player_state.team,
            ACTION_TOWER_BUILT,
            lane as u16,
            ((tower_kind as u16) << 8) | slot as u16,
            definition.cost,
        )?;
        Ok(())
    }

    pub fn advance_tick<'info>(ctx: Context<'_, '_, 'info, 'info, AdvanceTick<'info>>, ticks: u16) -> Result<()> {
        let config = &ctx.accounts.game_config;
        let match_account = &mut ctx.accounts.match_account;
        let reward_vault_info = ctx.accounts.reward_vault.to_account_info();
        let reward_vault_authority_info = ctx.accounts.reward_vault_authority.to_account_info();
        let token_program_info = ctx.accounts.token_program.to_account_info();
        require!(match_account.phase == PHASE_LIVE, FortressError::InvalidPhase);
        require!(ticks > 0, FortressError::InvalidTickCount);

        for _ in 0..ticks {
            match_account.current_tick = match_account.current_tick.checked_add(1).ok_or(FortressError::MathOverflow)?;
            resolve_towers(
                config,
                match_account,
                &mut ctx.accounts.action_log,
                &ctx.remaining_accounts,
                reward_vault_info.clone(),
                reward_vault_authority_info.clone(),
                token_program_info.clone(),
            )?;
            resolve_units(
                config,
                match_account,
                &mut ctx.accounts.action_log,
                &ctx.remaining_accounts,
                reward_vault_info.clone(),
                reward_vault_authority_info.clone(),
                token_program_info.clone(),
            )?;

            let tick_value = match_account.current_tick;
            append_action(
                match_account,
                &mut ctx.accounts.action_log,
                ctx.accounts.tick_authority.key(),
                TEAM_UNSET,
                ACTION_TICK_ADVANCED,
                0,
                0,
                tick_value,
            )?;

            if match_account.current_tick % CHECKPOINT_INTERVAL == 0 || match_account.phase == PHASE_FINISHED {
                write_checkpoint(match_account, &mut ctx.accounts.checkpoint, &mut ctx.accounts.action_log)?;
            }

            if match_account.phase == PHASE_FINISHED {
                break;
            }
        }

        Ok(())
    }

    pub fn settle_match<'info>(ctx: Context<'_, '_, 'info, 'info, SettleMatch<'info>>) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        let match_vault_info = ctx.accounts.match_vault.to_account_info();
        let match_vault_authority_info = ctx.accounts.match_vault_authority.to_account_info();
        let reward_vault_info = ctx.accounts.reward_vault.to_account_info();
        let reward_vault_authority_info = ctx.accounts.reward_vault_authority.to_account_info();
        let token_program_info = ctx.accounts.token_program.to_account_info();
        require!(match_account.phase == PHASE_FINISHED, FortressError::InvalidPhase);
        require!(!match_account.settled, FortressError::AlreadySettled);
        require!(match_account.winner_team < TEAM_COUNT as u8, FortressError::NoWinnerYet);

        let winners = collect_winners(match_account);
        require!(!winners.is_empty(), FortressError::NoWinnerYet);

        let match_vault_total = ctx.accounts.match_vault.amount;
        let reward_vault_total = ctx.accounts.reward_vault.amount;
        let vault_total = match_vault_total.checked_add(reward_vault_total).ok_or(FortressError::MathOverflow)?;

        if match_vault_total > 0 {
            distribute_from_vault(
                match_vault_info.clone(),
                match_vault_authority_info.clone(),
                token_program_info.clone(),
                &ctx.remaining_accounts,
                &winners,
                match_vault_total,
                b"match-vault-authority",
                match_account.match_id,
            )?;
        }

        if reward_vault_total > 0 {
            distribute_from_vault(
                reward_vault_info.clone(),
                reward_vault_authority_info.clone(),
                token_program_info.clone(),
                &ctx.remaining_accounts,
                &winners,
                reward_vault_total,
                b"reward-vault-authority",
                match_account.match_id,
            )?;
        }

        match_account.settled = true;
        let winner_team = match_account.winner_team;
        append_action(
            match_account,
            &mut ctx.accounts.action_log,
            ctx.accounts.authority.key(),
            winner_team,
            ACTION_MATCH_SETTLED,
            winners.len() as u16,
            0,
            vault_total,
        )?;
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeGameConfigArgs {
    pub version: u16,
    pub lane_count: u8,
    pub max_players_per_team: u8,
    pub reward_model: u8,
    pub fortress_health: u64,
    pub unit_kinds: Vec<UnitDefinition>,
    pub tower_kinds: Vec<TowerDefinition>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateMatchArgs {
    pub initial_reward_pool: u64,
}

#[derive(Accounts)]
pub struct InitializeGameConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    /// CHECK: Treasury can be a multisig or program-owned account.
    pub treasury: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = GameConfig::SPACE,
        seeds = [b"game-config"],
        bump
    )]
    pub game_config: Account<'info, GameConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut, seeds = [b"game-config"], bump = game_config.bump)]
    pub game_config: Account<'info, GameConfig>,
    #[account(
        init,
        payer = creator,
        space = MatchAccount::SPACE,
        seeds = [b"match".as_ref(), game_config.next_match_id.to_le_bytes().as_ref()],
        bump
    )]
    pub match_account: Account<'info, MatchAccount>,
    #[account(
        init,
        payer = creator,
        space = ActionLog::SPACE,
        seeds = [b"action-log".as_ref(), game_config.next_match_id.to_le_bytes().as_ref()],
        bump
    )]
    pub action_log: Account<'info, ActionLog>,
    #[account(
        init,
        payer = creator,
        space = CheckpointAccount::SPACE,
        seeds = [b"checkpoint".as_ref(), game_config.next_match_id.to_le_bytes().as_ref()],
        bump
    )]
    pub checkpoint: Account<'info, CheckpointAccount>,
    #[account(
        init,
        payer = creator,
        token::mint = token_mint,
        token::authority = match_vault_authority,
        seeds = [b"match-vault".as_ref(), game_config.next_match_id.to_le_bytes().as_ref()],
        bump
    )]
    pub match_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = creator,
        token::mint = token_mint,
        token::authority = reward_vault_authority,
        seeds = [b"reward-vault".as_ref(), game_config.next_match_id.to_le_bytes().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA authority for the match vault.
    #[account(seeds = [b"match-vault-authority".as_ref(), game_config.next_match_id.to_le_bytes().as_ref()], bump)]
    pub match_vault_authority: UncheckedAccount<'info>,
    /// CHECK: PDA authority for the reward vault.
    #[account(seeds = [b"reward-vault-authority".as_ref(), game_config.next_match_id.to_le_bytes().as_ref()], bump)]
    pub reward_vault_authority: UncheckedAccount<'info>,
    #[account(mut, constraint = creator_token_account.owner == creator.key() @ FortressError::UnauthorizedPlayer)]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(address = game_config.token_mint)]
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct JoinMatch<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(seeds = [b"game-config"], bump = game_config.bump)]
    pub game_config: Account<'info, GameConfig>,
    #[account(mut, seeds = [b"match", &match_account.match_id.to_le_bytes()], bump = match_account.bump)]
    pub match_account: Account<'info, MatchAccount>,
    #[account(mut, seeds = [b"action-log", &match_account.match_id.to_le_bytes()], bump)]
    pub action_log: Account<'info, ActionLog>,
    #[account(
        init,
        payer = player,
        space = PlayerState::SPACE,
        seeds = [b"player-state", match_account.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"game-config"], bump = game_config.bump, has_one = authority @ FortressError::UnauthorizedPlayer)]
    pub game_config: Account<'info, GameConfig>,
    #[account(mut, seeds = [b"match", &match_account.match_id.to_le_bytes()], bump = match_account.bump)]
    pub match_account: Account<'info, MatchAccount>,
    #[account(mut, seeds = [b"action-log", &match_account.match_id.to_le_bytes()], bump)]
    pub action_log: Account<'info, ActionLog>,
    #[account(mut, seeds = [b"checkpoint", &match_account.match_id.to_le_bytes()], bump)]
    pub checkpoint: Account<'info, CheckpointAccount>,
}

#[derive(Accounts)]
pub struct DeployUnit<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(seeds = [b"game-config"], bump = game_config.bump)]
    pub game_config: Account<'info, GameConfig>,
    #[account(mut, seeds = [b"match", &match_account.match_id.to_le_bytes()], bump = match_account.bump)]
    pub match_account: Account<'info, MatchAccount>,
    #[account(mut, seeds = [b"player-state", match_account.key().as_ref(), player.key().as_ref()], bump = player_state.bump)]
    pub player_state: Account<'info, PlayerState>,
    #[account(mut, seeds = [b"action-log", &match_account.match_id.to_le_bytes()], bump)]
    pub action_log: Account<'info, ActionLog>,
    #[account(mut, constraint = player_token_account.owner == player.key() @ FortressError::UnauthorizedPlayer)]
    pub player_token_account: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"match-vault", &match_account.match_id.to_le_bytes()], bump)]
    pub match_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BuildTower<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(seeds = [b"game-config"], bump = game_config.bump)]
    pub game_config: Account<'info, GameConfig>,
    #[account(mut, seeds = [b"match", &match_account.match_id.to_le_bytes()], bump = match_account.bump)]
    pub match_account: Account<'info, MatchAccount>,
    #[account(mut, seeds = [b"player-state", match_account.key().as_ref(), player.key().as_ref()], bump = player_state.bump)]
    pub player_state: Account<'info, PlayerState>,
    #[account(mut, seeds = [b"action-log", &match_account.match_id.to_le_bytes()], bump)]
    pub action_log: Account<'info, ActionLog>,
    #[account(mut, constraint = player_token_account.owner == player.key() @ FortressError::UnauthorizedPlayer)]
    pub player_token_account: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"match-vault", &match_account.match_id.to_le_bytes()], bump)]
    pub match_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdvanceTick<'info> {
    #[account(mut)]
    pub tick_authority: Signer<'info>,
    #[account(seeds = [b"game-config"], bump = game_config.bump)]
    pub game_config: Account<'info, GameConfig>,
    #[account(mut, seeds = [b"match", &match_account.match_id.to_le_bytes()], bump = match_account.bump)]
    pub match_account: Account<'info, MatchAccount>,
    #[account(mut, seeds = [b"action-log", &match_account.match_id.to_le_bytes()], bump)]
    pub action_log: Account<'info, ActionLog>,
    #[account(mut, seeds = [b"checkpoint", &match_account.match_id.to_le_bytes()], bump)]
    pub checkpoint: Account<'info, CheckpointAccount>,
    #[account(mut, seeds = [b"reward-vault", &match_account.match_id.to_le_bytes()], bump)]
    pub reward_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA authority for transfer signing.
    #[account(seeds = [b"reward-vault-authority", &match_account.match_id.to_le_bytes()], bump)]
    pub reward_vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SettleMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"game-config"], bump = game_config.bump, has_one = authority @ FortressError::UnauthorizedPlayer)]
    pub game_config: Account<'info, GameConfig>,
    #[account(mut, seeds = [b"match", &match_account.match_id.to_le_bytes()], bump = match_account.bump)]
    pub match_account: Account<'info, MatchAccount>,
    #[account(mut, seeds = [b"action-log", &match_account.match_id.to_le_bytes()], bump)]
    pub action_log: Account<'info, ActionLog>,
    #[account(mut, seeds = [b"match-vault", &match_account.match_id.to_le_bytes()], bump)]
    pub match_vault: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"reward-vault", &match_account.match_id.to_le_bytes()], bump)]
    pub reward_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA authority for transfer signing.
    #[account(seeds = [b"match-vault-authority", &match_account.match_id.to_le_bytes()], bump)]
    pub match_vault_authority: UncheckedAccount<'info>,
    /// CHECK: PDA authority for transfer signing.
    #[account(seeds = [b"reward-vault-authority", &match_account.match_id.to_le_bytes()], bump)]
    pub reward_vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct GameConfig {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub bump: u8,
    pub version: u16,
    pub lane_count: u8,
    pub max_players_per_team: u8,
    pub reward_model: u8,
    pub fortress_health: u64,
    pub next_match_id: u64,
    pub unit_kinds: Vec<UnitDefinition>,
    pub tower_kinds: Vec<TowerDefinition>,
}

impl GameConfig {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 1 + 2 + 1 + 1 + 1 + 8 + 8 + 4 + (MAX_UNIT_KINDS * UnitDefinition::SIZE) + 4 + (MAX_TOWER_KINDS * TowerDefinition::SIZE);
}

#[account]
pub struct MatchAccount {
    pub bump: u8,
    pub match_id: u64,
    pub config: Pubkey,
    pub creator: Pubkey,
    pub phase: u8,
    pub lane_count: u8,
    pub current_tick: u64,
    pub action_sequence: u64,
    pub checkpoint_count: u32,
    pub winner_team: u8,
    pub settled: bool,
    pub team_player_counts: [u8; TEAM_COUNT],
    pub players: [Pubkey; MAX_PLAYERS],
    pub player_teams: [u8; MAX_PLAYERS],
    pub fortress_hp: [u64; TEAM_COUNT],
    pub next_unit_id: u32,
    pub next_tower_id: u32,
    pub reward_pool_seeded: u64,
    pub units: Vec<UnitInstance>,
    pub towers: Vec<TowerInstance>,
}

impl MatchAccount {
    pub const SPACE: usize = 8 + 1 + 8 + 32 + 32 + 1 + 1 + 8 + 8 + 4 + 1 + 1 + TEAM_COUNT + (32 * MAX_PLAYERS) + MAX_PLAYERS + (8 * TEAM_COUNT) + 4 + 4 + 8 + 4 + (MAX_UNITS * UnitInstance::SIZE) + 4 + (MAX_TOWERS * TowerInstance::SIZE);
}

#[account]
pub struct PlayerState {
    pub bump: u8,
    pub match_account: Pubkey,
    pub player: Pubkey,
    pub team: u8,
    pub total_spent: u64,
    pub total_rewarded: u64,
    pub joined: bool,
}

impl PlayerState {
    pub const SPACE: usize = 8 + 1 + 32 + 32 + 1 + 8 + 8 + 1;
}

#[account]
pub struct ActionLog {
    pub match_account: Pubkey,
    pub records: Vec<ActionRecord>,
}

impl ActionLog {
    pub const SPACE: usize = 8 + 32 + 4 + (MAX_ACTIONS * ActionRecord::SIZE);
}

#[account]
pub struct CheckpointAccount {
    pub match_account: Pubkey,
    pub total_checkpoints: u32,
    pub last_tick: u64,
    pub last_hash: [u8; 32],
}

impl CheckpointAccount {
    pub const SPACE: usize = 8 + 32 + 4 + 8 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct UnitDefinition {
    pub id: u8,
    pub cost: u64,
    pub reward: u64,
    pub health: u16,
    pub damage: u16,
    pub range: u16,
    pub speed: u16,
    pub fortress_damage: u16,
    pub cooldown_ticks: u8,
}

impl UnitDefinition {
    pub const SIZE: usize = 1 + 8 + 8 + 2 + 2 + 2 + 2 + 2 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct TowerDefinition {
    pub id: u8,
    pub cost: u64,
    pub reward: u64,
    pub health: u16,
    pub damage: u16,
    pub range: u16,
    pub attack_cooldown: u8,
}

impl TowerDefinition {
    pub const SIZE: usize = 1 + 8 + 8 + 2 + 2 + 2 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct UnitInstance {
    pub id: u32,
    pub owner: Pubkey,
    pub team: u8,
    pub lane: u8,
    pub kind: u8,
    pub position: u16,
    pub hp: u16,
    pub cooldown: u8,
    pub alive: bool,
}

impl UnitInstance {
    pub const SIZE: usize = 4 + 32 + 1 + 1 + 1 + 2 + 2 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct TowerInstance {
    pub id: u32,
    pub owner: Pubkey,
    pub team: u8,
    pub lane: u8,
    pub slot: u8,
    pub kind: u8,
    pub hp: u16,
    pub cooldown: u8,
    pub alive: bool,
}

impl TowerInstance {
    pub const SIZE: usize = 4 + 32 + 1 + 1 + 1 + 1 + 2 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct ActionRecord {
    pub sequence: u64,
    pub tick: u64,
    pub actor: Pubkey,
    pub team: u8,
    pub action_type: u8,
    pub primary: u16,
    pub secondary: u16,
    pub amount: u64,
}

impl ActionRecord {
    pub const SIZE: usize = 8 + 8 + 32 + 1 + 1 + 2 + 2 + 8;
}

fn append_action(
    match_account: &mut MatchAccount,
    action_log: &mut Account<ActionLog>,
    actor: Pubkey,
    team: u8,
    action_type: u8,
    primary: u16,
    secondary: u16,
    amount: u64,
) -> Result<()> {
    require!(action_log.records.len() < MAX_ACTIONS, FortressError::ActionLogFull);
    action_log.records.push(ActionRecord {
        sequence: match_account.action_sequence,
        tick: match_account.current_tick,
        actor,
        team,
        action_type,
        primary,
        secondary,
        amount,
    });
    match_account.action_sequence = match_account.action_sequence.checked_add(1).ok_or(FortressError::MathOverflow)?;
    Ok(())
}

fn write_checkpoint(match_account: &mut MatchAccount, checkpoint: &mut Account<CheckpointAccount>, action_log: &mut Account<ActionLog>) -> Result<()> {
    let hash = calculate_match_hash(match_account);
    checkpoint.total_checkpoints = checkpoint.total_checkpoints.checked_add(1).ok_or(FortressError::MathOverflow)?;
    checkpoint.last_tick = match_account.current_tick;
    checkpoint.last_hash = hash;
    match_account.checkpoint_count = checkpoint.total_checkpoints;
    append_action(
        match_account,
        action_log,
        Pubkey::default(),
        TEAM_UNSET,
        ACTION_CHECKPOINT_WRITTEN,
        checkpoint.total_checkpoints as u16,
        0,
        match_account.current_tick,
    )
}

fn calculate_match_hash(match_account: &MatchAccount) -> [u8; 32] {
    let mut data = Vec::new();
    data.extend_from_slice(&match_account.match_id.to_le_bytes());
    data.extend_from_slice(&match_account.current_tick.to_le_bytes());
    data.extend_from_slice(&match_account.fortress_hp[0].to_le_bytes());
    data.extend_from_slice(&match_account.fortress_hp[1].to_le_bytes());
    data.extend_from_slice(&(match_account.units.len() as u64).to_le_bytes());
    data.extend_from_slice(&(match_account.towers.len() as u64).to_le_bytes());
    for unit in &match_account.units {
        data.extend_from_slice(&unit.id.to_le_bytes());
        data.extend_from_slice(unit.owner.as_ref());
        data.push(unit.team);
        data.push(unit.lane);
        data.push(unit.kind);
        data.extend_from_slice(&unit.position.to_le_bytes());
        data.extend_from_slice(&unit.hp.to_le_bytes());
        data.push(unit.cooldown);
        data.push(unit.alive as u8);
    }
    for tower in &match_account.towers {
        data.extend_from_slice(&tower.id.to_le_bytes());
        data.extend_from_slice(tower.owner.as_ref());
        data.push(tower.team);
        data.push(tower.lane);
        data.push(tower.slot);
        data.push(tower.kind);
        data.extend_from_slice(&tower.hp.to_le_bytes());
        data.push(tower.cooldown);
        data.push(tower.alive as u8);
    }
    hashv(&[&data]).to_bytes()
}

fn resolve_towers<'info>(
    config: &GameConfig,
    match_account: &mut MatchAccount,
    action_log: &mut Account<ActionLog>,
    remaining_accounts: &'info [AccountInfo<'info>],
    reward_vault: AccountInfo<'info>,
    reward_vault_authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
) -> Result<()> {
    for tower_index in 0..match_account.towers.len() {
        if !match_account.towers[tower_index].alive {
            continue;
        }
        if match_account.towers[tower_index].cooldown > 0 {
            match_account.towers[tower_index].cooldown -= 1;
            continue;
        }

        let tower = match_account.towers[tower_index].clone();
        let definition = config.tower_kinds.iter().find(|kind| kind.id == tower.kind).ok_or(FortressError::UnknownTowerKind)?;
        let position = tower_position(tower.team, tower.slot);
        if let Some(target_index) = nearest_enemy_unit(match_account, tower.team, tower.lane, position, definition.range) {
            let target_id = match_account.units[target_index].id as u16;
            let target_kind = match_account.units[target_index].kind;
            let new_hp = match_account.units[target_index].hp.saturating_sub(definition.damage);
            match_account.towers[tower_index].cooldown = definition.attack_cooldown;
            match_account.units[target_index].hp = new_hp;
            if new_hp == 0 && match_account.units[target_index].alive {
                match_account.units[target_index].alive = false;
                let reward = config.unit_kinds.iter().find(|kind| kind.id == target_kind).ok_or(FortressError::UnknownUnitKind)?.reward;
                pay_reward(
                    match_account,
                    action_log,
                    remaining_accounts,
                    reward_vault.clone(),
                    reward_vault_authority.clone(),
                    token_program.clone(),
                    tower.owner,
                    ACTION_UNIT_KILLED,
                    target_id,
                    reward,
                )?;
            }
        }
    }
    Ok(())
}

fn resolve_units<'info>(
    config: &GameConfig,
    match_account: &mut MatchAccount,
    action_log: &mut Account<ActionLog>,
    remaining_accounts: &'info [AccountInfo<'info>],
    reward_vault: AccountInfo<'info>,
    reward_vault_authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
) -> Result<()> {
    for unit_index in 0..match_account.units.len() {
        if !match_account.units[unit_index].alive {
            continue;
        }
        if match_account.units[unit_index].cooldown > 0 {
            match_account.units[unit_index].cooldown -= 1;
        }

        let unit = match_account.units[unit_index].clone();
        let definition = config.unit_kinds.iter().find(|kind| kind.id == unit.kind).ok_or(FortressError::UnknownUnitKind)?;
        if let Some(target_index) = nearest_enemy_tower(match_account, unit.team, unit.lane, unit.position, definition.range) {
            if match_account.units[unit_index].cooldown == 0 {
                let target_id = match_account.towers[target_index].id as u16;
                let target_kind = match_account.towers[target_index].kind;
                let new_hp = match_account.towers[target_index].hp.saturating_sub(definition.damage);
                match_account.units[unit_index].cooldown = definition.cooldown_ticks;
                match_account.towers[target_index].hp = new_hp;
                if new_hp == 0 && match_account.towers[target_index].alive {
                    match_account.towers[target_index].alive = false;
                    let reward = config.tower_kinds.iter().find(|kind| kind.id == target_kind).ok_or(FortressError::UnknownTowerKind)?.reward;
                    pay_reward(
                        match_account,
                        action_log,
                        remaining_accounts,
                        reward_vault.clone(),
                        reward_vault_authority.clone(),
                        token_program.clone(),
                        unit.owner,
                        ACTION_TOWER_DESTROYED,
                        target_id,
                        reward,
                    )?;
                }
            }
            continue;
        }

        let enemy_team = opposing_team(unit.team);
        if is_at_enemy_fortress(unit.team, unit.position) {
            if match_account.units[unit_index].cooldown == 0 {
                match_account.fortress_hp[enemy_team as usize] = match_account.fortress_hp[enemy_team as usize].saturating_sub(definition.fortress_damage as u64);
                match_account.units[unit_index].cooldown = definition.cooldown_ticks;
                append_action(
                    match_account,
                    action_log,
                    unit.owner,
                    unit.team,
                    ACTION_FORTRESS_HIT,
                    enemy_team as u16,
                    unit.id as u16,
                    definition.fortress_damage as u64,
                )?;
                if match_account.fortress_hp[enemy_team as usize] == 0 {
                    match_account.phase = PHASE_FINISHED;
                    match_account.winner_team = unit.team;
                    return Ok(());
                }
            }
            continue;
        }

        move_unit(&mut match_account.units[unit_index], definition.speed);
    }
    Ok(())
}

fn pay_reward<'info>(
    match_account: &mut MatchAccount,
    action_log: &mut Account<ActionLog>,
    remaining_accounts: &'info [AccountInfo<'info>],
    reward_vault: AccountInfo<'info>,
    reward_vault_authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    owner: Pubkey,
    action_type: u8,
    entity_id: u16,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let reward_vault_data = anchor_spl::token::spl_token::state::Account::unpack(&reward_vault.try_borrow_data()?)?;
    let destination = find_destination_token_account(remaining_accounts, &owner, &reward_vault_data.mint)?;
    let bump = Pubkey::find_program_address(&[b"reward-vault-authority", &match_account.match_id.to_le_bytes()], &crate::ID).1;
    let signer_seeds: &[&[&[u8]]] = &[&[b"reward-vault-authority", &match_account.match_id.to_le_bytes(), &[bump]]];
    let transfer_accounts = Transfer {
        from: reward_vault,
        to: destination,
        authority: reward_vault_authority,
    };
    token::transfer(CpiContext::new_with_signer(token_program, transfer_accounts, signer_seeds), amount)?;
    append_action(match_account, action_log, owner, TEAM_UNSET, action_type, entity_id, 0, amount)?;
    Ok(())
}

fn distribute_from_vault<'info>(
    vault: AccountInfo<'info>,
    vault_authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    remaining_accounts: &'info [AccountInfo<'info>],
    winners: &[Pubkey],
    total_amount: u64,
    authority_seed_prefix: &[u8],
    match_id: u64,
) -> Result<()> {
    let vault_data = anchor_spl::token::spl_token::state::Account::unpack(&vault.try_borrow_data()?)?;
    let share = total_amount / winners.len() as u64;
    let remainder = total_amount % winners.len() as u64;
    let mut extra = remainder;
    for winner in winners {
        let mut amount = share;
        if extra > 0 {
            amount = amount.checked_add(1).ok_or(FortressError::MathOverflow)?;
            extra -= 1;
        }
        if amount == 0 {
            continue;
        }
        let destination = find_destination_token_account(remaining_accounts, winner, &vault_data.mint)?;
        let bump = Pubkey::find_program_address(&[authority_seed_prefix, &match_id.to_le_bytes()], &crate::ID).1;
        let signer_seeds: &[&[&[u8]]] = &[&[authority_seed_prefix, &match_id.to_le_bytes(), &[bump]]];
        let transfer_accounts = Transfer {
            from: vault.clone(),
            to: destination,
            authority: vault_authority.clone(),
        };
        token::transfer(CpiContext::new_with_signer(token_program.clone(), transfer_accounts, signer_seeds), amount)?;
    }
    Ok(())
}

fn transfer_tokens<'info>(
    token_program: &Program<'info, Token>,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &Signer<'info>,
    amount: u64,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    let transfer_accounts = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };
    let context = match signer_seeds {
        Some(seeds) => CpiContext::new_with_signer(token_program.to_account_info(), transfer_accounts, seeds),
        None => CpiContext::new(token_program.to_account_info(), transfer_accounts),
    };
    token::transfer(context, amount)
}

fn find_destination_token_account<'info>(remaining_accounts: &'info [AccountInfo<'info>], owner: &Pubkey, mint: &Pubkey) -> Result<AccountInfo<'info>> {
    for account in remaining_accounts {
        let token_account = Account::<TokenAccount>::try_from(account)?;
        if token_account.owner == *owner && token_account.mint == *mint {
            return Ok(account.clone());
        }
    }
    err!(FortressError::MissingRewardDestination)
}

fn player_is_registered(match_account: &MatchAccount, player: &Pubkey) -> bool {
    match_account.players.iter().any(|member| member == player)
}

fn first_open_player_slot(match_account: &MatchAccount) -> Option<usize> {
    match_account.players.iter().position(|member| *member == Pubkey::default())
}

fn tower_slot_occupied(match_account: &MatchAccount, team: u8, lane: u8, slot: u8) -> bool {
    match_account
        .towers
        .iter()
        .any(|tower| tower.alive && tower.team == team && tower.lane == lane && tower.slot == slot)
}

fn tower_position(team: u8, slot: u8) -> u16 {
    let base = 20u16.saturating_add((slot as u16).saturating_mul(15));
    if team == 0 { base } else { 100u16.saturating_sub(base) }
}

fn nearest_enemy_unit(match_account: &MatchAccount, team: u8, lane: u8, origin: u16, range: u16) -> Option<usize> {
    match_account
        .units
        .iter()
        .enumerate()
        .filter(|(_, unit)| unit.alive && unit.team != team && unit.lane == lane)
        .filter(|(_, unit)| distance(origin, unit.position) <= range)
        .min_by_key(|(_, unit)| distance(origin, unit.position))
        .map(|(index, _)| index)
}

fn nearest_enemy_tower(match_account: &MatchAccount, team: u8, lane: u8, origin: u16, range: u16) -> Option<usize> {
    match_account
        .towers
        .iter()
        .enumerate()
        .filter(|(_, tower)| tower.alive && tower.team != team && tower.lane == lane)
        .filter(|(_, tower)| distance(origin, tower_position(tower.team, tower.slot)) <= range)
        .min_by_key(|(_, tower)| distance(origin, tower_position(tower.team, tower.slot)))
        .map(|(index, _)| index)
}

fn distance(a: u16, b: u16) -> u16 {
    a.abs_diff(b)
}

fn opposing_team(team: u8) -> u8 {
    if team == 0 { 1 } else { 0 }
}

fn is_at_enemy_fortress(team: u8, position: u16) -> bool {
    if team == 0 { position >= FORTRESS_POSITION_END } else { position <= FORTRESS_POSITION_START }
}

fn move_unit(unit: &mut UnitInstance, speed: u16) {
    if unit.team == 0 {
        unit.position = unit.position.saturating_add(speed).min(FORTRESS_POSITION_END);
    } else {
        unit.position = unit.position.saturating_sub(speed);
    }
}

fn collect_winners(match_account: &MatchAccount) -> Vec<Pubkey> {
    match_account
        .players
        .iter()
        .zip(match_account.player_teams.iter())
        .filter(|(player, team)| **player != Pubkey::default() && **team == match_account.winner_team)
        .map(|(player, _)| *player)
        .collect()
}

#[error_code]
pub enum FortressError {
    #[msg("Too many unit or tower definitions were provided.")]
    TooManyDefinitions,
    #[msg("The lane index is invalid.")]
    InvalidLane,
    #[msg("The player count is invalid.")]
    InvalidPlayerCount,
    #[msg("The provided token mint does not match the game config.")]
    InvalidTokenMint,
    #[msg("The team index is invalid.")]
    InvalidTeam,
    #[msg("The match already started.")]
    MatchAlreadyStarted,
    #[msg("The team is full.")]
    TeamFull,
    #[msg("The player already joined this match.")]
    PlayerAlreadyJoined,
    #[msg("The roster is full.")]
    RosterFull,
    #[msg("The match phase does not allow this action.")]
    InvalidPhase,
    #[msg("Both teams must have at least one player before the match can start.")]
    TeamsNotReady,
    #[msg("The player is not authorized for this action.")]
    UnauthorizedPlayer,
    #[msg("The player state references a different match.")]
    WrongMatch,
    #[msg("The maximum entity capacity was reached for this match.")]
    EntityCapacityReached,
    #[msg("The requested unit kind does not exist.")]
    UnknownUnitKind,
    #[msg("The requested tower kind does not exist.")]
    UnknownTowerKind,
    #[msg("The tower slot is already occupied.")]
    TowerSlotOccupied,
    #[msg("Arithmetic overflow occurred.")]
    MathOverflow,
    #[msg("The action log is full.")]
    ActionLogFull,
    #[msg("The number of ticks must be positive.")]
    InvalidTickCount,
    #[msg("A reward destination token account was not provided.")]
    MissingRewardDestination,
    #[msg("The match has already been settled.")]
    AlreadySettled,
    #[msg("The match does not have a winner yet.")]
    NoWinnerYet,
}