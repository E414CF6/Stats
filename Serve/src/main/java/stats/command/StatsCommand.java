package stats.command;

import stats.Serve;
import stats.security.RsaKeyUtils;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;

import java.util.List;

public class StatsCommand implements CommandExecutor, TabCompleter {

    private final Serve plugin;

    public StatsCommand(Serve plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!sender.hasPermission("Serve.admin")) {
            sender.sendMessage(ChatColor.RED + "You do not have permission to execute this command.");
            return true;
        }

        if (label.equalsIgnoreCase("statsreload") || (args.length > 0 && args[0].equalsIgnoreCase("reload"))) {
            sender.sendMessage(ChatColor.YELLOW + "[Serve] Reloading configuration...");
            try {
                plugin.reloadPluginConfig();
                sender.sendMessage(ChatColor.GREEN + "[Serve] Configuration successfully reloaded!");
            } catch (Exception e) {
                sender.sendMessage(ChatColor.RED + "[Serve] Failed to reload configuration: " + e.getMessage());
            }
            return true;
        }

        if (args.length > 0 && args[0].equalsIgnoreCase("genkey")) {
            sender.sendMessage(ChatColor.YELLOW + "[Serve] Generating new 2048-bit RSA key pair...");
            try {
                plugin.getRsaAuthManager().generateNewKeys();
                sender.sendMessage(ChatColor.GREEN + "[Serve] New RSA keypair successfully generated in plugins/Serve/keys/!");
                sender.sendMessage(ChatColor.AQUA + "Remember to copy private_key.pem to your Viewer/.env.local (RSA_PRIVATE_KEY)!");
            } catch (Exception e) {
                sender.sendMessage(ChatColor.RED + "[Serve] Failed to generate keys: " + e.getMessage());
            }
            return true;
        }

        if (args.length > 0 && args[0].equalsIgnoreCase("status")) {
            boolean rsaReq = plugin.getPluginConfig().requireRsaSignature();
            boolean hasPub = plugin.getRsaAuthManager() != null && plugin.getRsaAuthManager().getPublicKey() != null;
            sender.sendMessage(ChatColor.GOLD + "=== Serve Status ===");
            sender.sendMessage(ChatColor.GRAY + "HTTP API: " + ChatColor.WHITE + "http://" + plugin.getPluginConfig().httpHost() + ":" + plugin.getPluginConfig().httpPort());
            sender.sendMessage(ChatColor.GRAY + "RSA Signature Auth: " + (rsaReq ? ChatColor.GREEN + "REQUIRED" : ChatColor.RED + "DISABLED"));
            sender.sendMessage(ChatColor.GRAY + "Public Key Loaded: " + (hasPub ? ChatColor.GREEN + "YES" : ChatColor.RED + "NO"));
            return true;
        }

        sender.sendMessage(ChatColor.GOLD + "=== Serve ===");
        sender.sendMessage(ChatColor.YELLOW + "/" + label + " reload" + ChatColor.WHITE + " - Reload configuration");
        sender.sendMessage(ChatColor.YELLOW + "/" + label + " genkey" + ChatColor.WHITE + " - Generate new RSA keypair");
        sender.sendMessage(ChatColor.YELLOW + "/" + label + " status" + ChatColor.WHITE + " - Check API & RSA status");
        return true;
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (!sender.hasPermission("Serve.admin")) {
            return List.of();
        }
        if (args.length == 1) {
            String prefix = args[0].toLowerCase();
            return List.of("reload", "genkey", "status").stream().filter(s -> s.startsWith(prefix)).toList();
        }
        return List.of();
    }
}
