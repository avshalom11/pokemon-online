// ============================================================================
// IMPORTANT — READ BEFORE USING THIS DATA
// ============================================================================
//
// GENERATION_1_LEARNSETS is NOT the original 1996 Pokémon Red/Blue/Yellow
// level-up learnset data.
//
// It is each species' MODERN (current-generation) level-up learnset,
// filtered down to only the moves that exist in this project's Generation 1
// move database (engine/moves/data/generation-1). Concretely: sourced from
// Pokémon Showdown's learnsets.ts by taking, for each move, the
// highest-generation "level-up" tag on record for that species (falling
// back through older generations for species not freshly re-verified in
// the very latest game).
//
// Two things follow from that, which would surprise anyone expecting
// authentic 1996 data:
//
//   1. LEVELS differ from the original games — decades of rebalancing
//      changed when many moves are learned.
//
//   2. The MOVE SET ITSELF can differ. A species may level into a
//      Generation 1 move here that it never learned by leveling up in
//      1996 — e.g. Pikachu learns Thunderbolt by level-up here; in 1996
//      Thunderbolt was TM24-only for Pikachu, never a level-up move.
//      Conversely, a move that genuinely was a 1996 level-up move for a
//      species is simply absent here if modern games moved it to
//      TM/egg/tutor-only — it was dropped, not preserved at its
//      historical level.
//
// This was a deliberate, documented choice (mirroring the same
// modern-data policy already used for move power/accuracy in
// engine/moves — see that folder's Phase 3B notes), not an oversight.
// If authentic 1996 learnsets are ever needed, this data does not provide
// them and a Generation-1-specific source would need to be used instead.
// ============================================================================

import type { PokemonLearnset } from "../../types/learnset.types.ts";

import { BULBASAUR_LEARNSET } from "./0001-bulbasaur.learnset.ts";
import { IVYSAUR_LEARNSET } from "./0002-ivysaur.learnset.ts";
import { VENUSAUR_LEARNSET } from "./0003-venusaur.learnset.ts";
import { CHARMANDER_LEARNSET } from "./0004-charmander.learnset.ts";
import { CHARMELEON_LEARNSET } from "./0005-charmeleon.learnset.ts";
import { CHARIZARD_LEARNSET } from "./0006-charizard.learnset.ts";
import { SQUIRTLE_LEARNSET } from "./0007-squirtle.learnset.ts";
import { WARTORTLE_LEARNSET } from "./0008-wartortle.learnset.ts";
import { BLASTOISE_LEARNSET } from "./0009-blastoise.learnset.ts";
import { CATERPIE_LEARNSET } from "./0010-caterpie.learnset.ts";
import { METAPOD_LEARNSET } from "./0011-metapod.learnset.ts";
import { BUTTERFREE_LEARNSET } from "./0012-butterfree.learnset.ts";
import { WEEDLE_LEARNSET } from "./0013-weedle.learnset.ts";
import { KAKUNA_LEARNSET } from "./0014-kakuna.learnset.ts";
import { BEEDRILL_LEARNSET } from "./0015-beedrill.learnset.ts";
import { PIDGEY_LEARNSET } from "./0016-pidgey.learnset.ts";
import { PIDGEOTTO_LEARNSET } from "./0017-pidgeotto.learnset.ts";
import { PIDGEOT_LEARNSET } from "./0018-pidgeot.learnset.ts";
import { RATTATA_LEARNSET } from "./0019-rattata.learnset.ts";
import { RATICATE_LEARNSET } from "./0020-raticate.learnset.ts";
import { SPEAROW_LEARNSET } from "./0021-spearow.learnset.ts";
import { FEAROW_LEARNSET } from "./0022-fearow.learnset.ts";
import { EKANS_LEARNSET } from "./0023-ekans.learnset.ts";
import { ARBOK_LEARNSET } from "./0024-arbok.learnset.ts";
import { PIKACHU_LEARNSET } from "./0025-pikachu.learnset.ts";
import { RAICHU_LEARNSET } from "./0026-raichu.learnset.ts";
import { SANDSHREW_LEARNSET } from "./0027-sandshrew.learnset.ts";
import { SANDSLASH_LEARNSET } from "./0028-sandslash.learnset.ts";
import { NIDORAN_F_LEARNSET } from "./0029-nidoran-f.learnset.ts";
import { NIDORINA_LEARNSET } from "./0030-nidorina.learnset.ts";
import { NIDOQUEEN_LEARNSET } from "./0031-nidoqueen.learnset.ts";
import { NIDORAN_M_LEARNSET } from "./0032-nidoran-m.learnset.ts";
import { NIDORINO_LEARNSET } from "./0033-nidorino.learnset.ts";
import { NIDOKING_LEARNSET } from "./0034-nidoking.learnset.ts";
import { CLEFAIRY_LEARNSET } from "./0035-clefairy.learnset.ts";
import { CLEFABLE_LEARNSET } from "./0036-clefable.learnset.ts";
import { VULPIX_LEARNSET } from "./0037-vulpix.learnset.ts";
import { NINETALES_LEARNSET } from "./0038-ninetales.learnset.ts";
import { JIGGLYPUFF_LEARNSET } from "./0039-jigglypuff.learnset.ts";
import { WIGGLYTUFF_LEARNSET } from "./0040-wigglytuff.learnset.ts";
import { ZUBAT_LEARNSET } from "./0041-zubat.learnset.ts";
import { GOLBAT_LEARNSET } from "./0042-golbat.learnset.ts";
import { ODDISH_LEARNSET } from "./0043-oddish.learnset.ts";
import { GLOOM_LEARNSET } from "./0044-gloom.learnset.ts";
import { VILEPLUME_LEARNSET } from "./0045-vileplume.learnset.ts";
import { PARAS_LEARNSET } from "./0046-paras.learnset.ts";
import { PARASECT_LEARNSET } from "./0047-parasect.learnset.ts";
import { VENONAT_LEARNSET } from "./0048-venonat.learnset.ts";
import { VENOMOTH_LEARNSET } from "./0049-venomoth.learnset.ts";
import { DIGLETT_LEARNSET } from "./0050-diglett.learnset.ts";
import { DUGTRIO_LEARNSET } from "./0051-dugtrio.learnset.ts";
import { MEOWTH_LEARNSET } from "./0052-meowth.learnset.ts";
import { PERSIAN_LEARNSET } from "./0053-persian.learnset.ts";
import { PSYDUCK_LEARNSET } from "./0054-psyduck.learnset.ts";
import { GOLDUCK_LEARNSET } from "./0055-golduck.learnset.ts";
import { MANKEY_LEARNSET } from "./0056-mankey.learnset.ts";
import { PRIMEAPE_LEARNSET } from "./0057-primeape.learnset.ts";
import { GROWLITHE_LEARNSET } from "./0058-growlithe.learnset.ts";
import { ARCANINE_LEARNSET } from "./0059-arcanine.learnset.ts";
import { POLIWAG_LEARNSET } from "./0060-poliwag.learnset.ts";
import { POLIWHIRL_LEARNSET } from "./0061-poliwhirl.learnset.ts";
import { POLIWRATH_LEARNSET } from "./0062-poliwrath.learnset.ts";
import { ABRA_LEARNSET } from "./0063-abra.learnset.ts";
import { KADABRA_LEARNSET } from "./0064-kadabra.learnset.ts";
import { ALAKAZAM_LEARNSET } from "./0065-alakazam.learnset.ts";
import { MACHOP_LEARNSET } from "./0066-machop.learnset.ts";
import { MACHOKE_LEARNSET } from "./0067-machoke.learnset.ts";
import { MACHAMP_LEARNSET } from "./0068-machamp.learnset.ts";
import { BELLSPROUT_LEARNSET } from "./0069-bellsprout.learnset.ts";
import { WEEPINBELL_LEARNSET } from "./0070-weepinbell.learnset.ts";
import { VICTREEBEL_LEARNSET } from "./0071-victreebel.learnset.ts";
import { TENTACOOL_LEARNSET } from "./0072-tentacool.learnset.ts";
import { TENTACRUEL_LEARNSET } from "./0073-tentacruel.learnset.ts";
import { GEODUDE_LEARNSET } from "./0074-geodude.learnset.ts";
import { GRAVELER_LEARNSET } from "./0075-graveler.learnset.ts";
import { GOLEM_LEARNSET } from "./0076-golem.learnset.ts";
import { PONYTA_LEARNSET } from "./0077-ponyta.learnset.ts";
import { RAPIDASH_LEARNSET } from "./0078-rapidash.learnset.ts";
import { SLOWPOKE_LEARNSET } from "./0079-slowpoke.learnset.ts";
import { SLOWBRO_LEARNSET } from "./0080-slowbro.learnset.ts";
import { MAGNEMITE_LEARNSET } from "./0081-magnemite.learnset.ts";
import { MAGNETON_LEARNSET } from "./0082-magneton.learnset.ts";
import { FARFETCHD_LEARNSET } from "./0083-farfetchd.learnset.ts";
import { DODUO_LEARNSET } from "./0084-doduo.learnset.ts";
import { DODRIO_LEARNSET } from "./0085-dodrio.learnset.ts";
import { SEEL_LEARNSET } from "./0086-seel.learnset.ts";
import { DEWGONG_LEARNSET } from "./0087-dewgong.learnset.ts";
import { GRIMER_LEARNSET } from "./0088-grimer.learnset.ts";
import { MUK_LEARNSET } from "./0089-muk.learnset.ts";
import { SHELLDER_LEARNSET } from "./0090-shellder.learnset.ts";
import { CLOYSTER_LEARNSET } from "./0091-cloyster.learnset.ts";
import { GASTLY_LEARNSET } from "./0092-gastly.learnset.ts";
import { HAUNTER_LEARNSET } from "./0093-haunter.learnset.ts";
import { GENGAR_LEARNSET } from "./0094-gengar.learnset.ts";
import { ONIX_LEARNSET } from "./0095-onix.learnset.ts";
import { DROWZEE_LEARNSET } from "./0096-drowzee.learnset.ts";
import { HYPNO_LEARNSET } from "./0097-hypno.learnset.ts";
import { KRABBY_LEARNSET } from "./0098-krabby.learnset.ts";
import { KINGLER_LEARNSET } from "./0099-kingler.learnset.ts";
import { VOLTORB_LEARNSET } from "./0100-voltorb.learnset.ts";
import { ELECTRODE_LEARNSET } from "./0101-electrode.learnset.ts";
import { EXEGGCUTE_LEARNSET } from "./0102-exeggcute.learnset.ts";
import { EXEGGUTOR_LEARNSET } from "./0103-exeggutor.learnset.ts";
import { CUBONE_LEARNSET } from "./0104-cubone.learnset.ts";
import { MAROWAK_LEARNSET } from "./0105-marowak.learnset.ts";
import { HITMONLEE_LEARNSET } from "./0106-hitmonlee.learnset.ts";
import { HITMONCHAN_LEARNSET } from "./0107-hitmonchan.learnset.ts";
import { LICKITUNG_LEARNSET } from "./0108-lickitung.learnset.ts";
import { KOFFING_LEARNSET } from "./0109-koffing.learnset.ts";
import { WEEZING_LEARNSET } from "./0110-weezing.learnset.ts";
import { RHYHORN_LEARNSET } from "./0111-rhyhorn.learnset.ts";
import { RHYDON_LEARNSET } from "./0112-rhydon.learnset.ts";
import { CHANSEY_LEARNSET } from "./0113-chansey.learnset.ts";
import { TANGELA_LEARNSET } from "./0114-tangela.learnset.ts";
import { KANGASKHAN_LEARNSET } from "./0115-kangaskhan.learnset.ts";
import { HORSEA_LEARNSET } from "./0116-horsea.learnset.ts";
import { SEADRA_LEARNSET } from "./0117-seadra.learnset.ts";
import { GOLDEEN_LEARNSET } from "./0118-goldeen.learnset.ts";
import { SEAKING_LEARNSET } from "./0119-seaking.learnset.ts";
import { STARYU_LEARNSET } from "./0120-staryu.learnset.ts";
import { STARMIE_LEARNSET } from "./0121-starmie.learnset.ts";
import { MR_MIME_LEARNSET } from "./0122-mr-mime.learnset.ts";
import { SCYTHER_LEARNSET } from "./0123-scyther.learnset.ts";
import { JYNX_LEARNSET } from "./0124-jynx.learnset.ts";
import { ELECTABUZZ_LEARNSET } from "./0125-electabuzz.learnset.ts";
import { MAGMAR_LEARNSET } from "./0126-magmar.learnset.ts";
import { PINSIR_LEARNSET } from "./0127-pinsir.learnset.ts";
import { TAUROS_LEARNSET } from "./0128-tauros.learnset.ts";
import { MAGIKARP_LEARNSET } from "./0129-magikarp.learnset.ts";
import { GYARADOS_LEARNSET } from "./0130-gyarados.learnset.ts";
import { LAPRAS_LEARNSET } from "./0131-lapras.learnset.ts";
import { DITTO_LEARNSET } from "./0132-ditto.learnset.ts";
import { EEVEE_LEARNSET } from "./0133-eevee.learnset.ts";
import { VAPOREON_LEARNSET } from "./0134-vaporeon.learnset.ts";
import { JOLTEON_LEARNSET } from "./0135-jolteon.learnset.ts";
import { FLAREON_LEARNSET } from "./0136-flareon.learnset.ts";
import { PORYGON_LEARNSET } from "./0137-porygon.learnset.ts";
import { OMANYTE_LEARNSET } from "./0138-omanyte.learnset.ts";
import { OMASTAR_LEARNSET } from "./0139-omastar.learnset.ts";
import { KABUTO_LEARNSET } from "./0140-kabuto.learnset.ts";
import { KABUTOPS_LEARNSET } from "./0141-kabutops.learnset.ts";
import { AERODACTYL_LEARNSET } from "./0142-aerodactyl.learnset.ts";
import { SNORLAX_LEARNSET } from "./0143-snorlax.learnset.ts";
import { ARTICUNO_LEARNSET } from "./0144-articuno.learnset.ts";
import { ZAPDOS_LEARNSET } from "./0145-zapdos.learnset.ts";
import { MOLTRES_LEARNSET } from "./0146-moltres.learnset.ts";
import { DRATINI_LEARNSET } from "./0147-dratini.learnset.ts";
import { DRAGONAIR_LEARNSET } from "./0148-dragonair.learnset.ts";
import { DRAGONITE_LEARNSET } from "./0149-dragonite.learnset.ts";
import { MEWTWO_LEARNSET } from "./0150-mewtwo.learnset.ts";
import { MEW_LEARNSET } from "./0151-mew.learnset.ts";

// One file per species (Bulbasaur #0001 through Mew #0151). Only
// kind: "level-up" entries exist here; TM/HM/egg/tutor/special moves are
// out of scope for this phase. See the IMPORTANT note at the top of this
// file for what "level-up" means here (modern data, not 1996 Gen1 data).
export const GENERATION_1_LEARNSETS: PokemonLearnset[] = [
  BULBASAUR_LEARNSET,
  IVYSAUR_LEARNSET,
  VENUSAUR_LEARNSET,
  CHARMANDER_LEARNSET,
  CHARMELEON_LEARNSET,
  CHARIZARD_LEARNSET,
  SQUIRTLE_LEARNSET,
  WARTORTLE_LEARNSET,
  BLASTOISE_LEARNSET,
  CATERPIE_LEARNSET,
  METAPOD_LEARNSET,
  BUTTERFREE_LEARNSET,
  WEEDLE_LEARNSET,
  KAKUNA_LEARNSET,
  BEEDRILL_LEARNSET,
  PIDGEY_LEARNSET,
  PIDGEOTTO_LEARNSET,
  PIDGEOT_LEARNSET,
  RATTATA_LEARNSET,
  RATICATE_LEARNSET,
  SPEAROW_LEARNSET,
  FEAROW_LEARNSET,
  EKANS_LEARNSET,
  ARBOK_LEARNSET,
  PIKACHU_LEARNSET,
  RAICHU_LEARNSET,
  SANDSHREW_LEARNSET,
  SANDSLASH_LEARNSET,
  NIDORAN_F_LEARNSET,
  NIDORINA_LEARNSET,
  NIDOQUEEN_LEARNSET,
  NIDORAN_M_LEARNSET,
  NIDORINO_LEARNSET,
  NIDOKING_LEARNSET,
  CLEFAIRY_LEARNSET,
  CLEFABLE_LEARNSET,
  VULPIX_LEARNSET,
  NINETALES_LEARNSET,
  JIGGLYPUFF_LEARNSET,
  WIGGLYTUFF_LEARNSET,
  ZUBAT_LEARNSET,
  GOLBAT_LEARNSET,
  ODDISH_LEARNSET,
  GLOOM_LEARNSET,
  VILEPLUME_LEARNSET,
  PARAS_LEARNSET,
  PARASECT_LEARNSET,
  VENONAT_LEARNSET,
  VENOMOTH_LEARNSET,
  DIGLETT_LEARNSET,
  DUGTRIO_LEARNSET,
  MEOWTH_LEARNSET,
  PERSIAN_LEARNSET,
  PSYDUCK_LEARNSET,
  GOLDUCK_LEARNSET,
  MANKEY_LEARNSET,
  PRIMEAPE_LEARNSET,
  GROWLITHE_LEARNSET,
  ARCANINE_LEARNSET,
  POLIWAG_LEARNSET,
  POLIWHIRL_LEARNSET,
  POLIWRATH_LEARNSET,
  ABRA_LEARNSET,
  KADABRA_LEARNSET,
  ALAKAZAM_LEARNSET,
  MACHOP_LEARNSET,
  MACHOKE_LEARNSET,
  MACHAMP_LEARNSET,
  BELLSPROUT_LEARNSET,
  WEEPINBELL_LEARNSET,
  VICTREEBEL_LEARNSET,
  TENTACOOL_LEARNSET,
  TENTACRUEL_LEARNSET,
  GEODUDE_LEARNSET,
  GRAVELER_LEARNSET,
  GOLEM_LEARNSET,
  PONYTA_LEARNSET,
  RAPIDASH_LEARNSET,
  SLOWPOKE_LEARNSET,
  SLOWBRO_LEARNSET,
  MAGNEMITE_LEARNSET,
  MAGNETON_LEARNSET,
  FARFETCHD_LEARNSET,
  DODUO_LEARNSET,
  DODRIO_LEARNSET,
  SEEL_LEARNSET,
  DEWGONG_LEARNSET,
  GRIMER_LEARNSET,
  MUK_LEARNSET,
  SHELLDER_LEARNSET,
  CLOYSTER_LEARNSET,
  GASTLY_LEARNSET,
  HAUNTER_LEARNSET,
  GENGAR_LEARNSET,
  ONIX_LEARNSET,
  DROWZEE_LEARNSET,
  HYPNO_LEARNSET,
  KRABBY_LEARNSET,
  KINGLER_LEARNSET,
  VOLTORB_LEARNSET,
  ELECTRODE_LEARNSET,
  EXEGGCUTE_LEARNSET,
  EXEGGUTOR_LEARNSET,
  CUBONE_LEARNSET,
  MAROWAK_LEARNSET,
  HITMONLEE_LEARNSET,
  HITMONCHAN_LEARNSET,
  LICKITUNG_LEARNSET,
  KOFFING_LEARNSET,
  WEEZING_LEARNSET,
  RHYHORN_LEARNSET,
  RHYDON_LEARNSET,
  CHANSEY_LEARNSET,
  TANGELA_LEARNSET,
  KANGASKHAN_LEARNSET,
  HORSEA_LEARNSET,
  SEADRA_LEARNSET,
  GOLDEEN_LEARNSET,
  SEAKING_LEARNSET,
  STARYU_LEARNSET,
  STARMIE_LEARNSET,
  MR_MIME_LEARNSET,
  SCYTHER_LEARNSET,
  JYNX_LEARNSET,
  ELECTABUZZ_LEARNSET,
  MAGMAR_LEARNSET,
  PINSIR_LEARNSET,
  TAUROS_LEARNSET,
  MAGIKARP_LEARNSET,
  GYARADOS_LEARNSET,
  LAPRAS_LEARNSET,
  DITTO_LEARNSET,
  EEVEE_LEARNSET,
  VAPOREON_LEARNSET,
  JOLTEON_LEARNSET,
  FLAREON_LEARNSET,
  PORYGON_LEARNSET,
  OMANYTE_LEARNSET,
  OMASTAR_LEARNSET,
  KABUTO_LEARNSET,
  KABUTOPS_LEARNSET,
  AERODACTYL_LEARNSET,
  SNORLAX_LEARNSET,
  ARTICUNO_LEARNSET,
  ZAPDOS_LEARNSET,
  MOLTRES_LEARNSET,
  DRATINI_LEARNSET,
  DRAGONAIR_LEARNSET,
  DRAGONITE_LEARNSET,
  MEWTWO_LEARNSET,
  MEW_LEARNSET,
];
