package stats.model;

import java.util.List;

public record PlaytimeDayRecord(int dateInt, String dateFormatted, List<Long> hours, long totalMs) {
}
